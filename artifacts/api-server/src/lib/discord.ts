import { db } from "@workspace/db";
import { accountsTable, siteConfigTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const DISCORD_TOKEN_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const DISCORD_API = "https://discord.com/api/v10";

// ── Credential cache ──────────────────────────────────────────────────────────

interface DiscordCredCache {
  botToken: string;
  webhookUrl: string;
  loadedAt: number;
}
let _credCache: DiscordCredCache | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Resolve Discord credentials.
 * Bot token and webhook URL are resolved INDEPENDENTLY:
 *   - env var takes priority per-field
 *   - if a field is absent from env, it falls back to site_config DB
 * This means having DISCORD_BOT_TOKEN in env does NOT prevent a webhook URL
 * saved via the admin UI from being used (and vice versa).
 */
export async function getDiscordCredentials(): Promise<{ botToken: string; webhookUrl: string }> {
  const envBot = process.env["DISCORD_BOT_TOKEN"] ?? "";
  const envWebhook = process.env["DISCORD_ADMIN_WEBHOOK_URL"] ?? "";

  // If both are in env, skip DB entirely
  if (envBot && envWebhook) {
    return { botToken: envBot, webhookUrl: envWebhook };
  }

  // Use cache if fresh (still need DB for whichever field is missing from env)
  if (_credCache && Date.now() - _credCache.loadedAt < CACHE_TTL_MS) {
    return {
      botToken: envBot || _credCache.botToken,
      webhookUrl: envWebhook || _credCache.webhookUrl,
    };
  }

  try {
    const rows = await db
      .select({ key: siteConfigTable.key, value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(inArray(siteConfigTable.key, ["discordBotToken", "discordAdminWebhookUrl"]));

    const dbToken = rows.find((r: { key: string; value: string }) => r.key === "discordBotToken")?.value ?? "";
    const dbWebhook = rows.find((r: { key: string; value: string }) => r.key === "discordAdminWebhookUrl")?.value ?? "";
    _credCache = { botToken: dbToken, webhookUrl: dbWebhook, loadedAt: Date.now() };
    // env always wins per-field; DB fills in whatever env is missing
    return { botToken: envBot || dbToken, webhookUrl: envWebhook || dbWebhook };
  } catch {
    return { botToken: envBot, webhookUrl: envWebhook };
  }
}

export function invalidateDiscordCache(): void {
  _credCache = null;
}

// ── DM sending ──────────────────────────────────────────────────────────────

async function openDmChannel(botToken: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export async function sendDiscordDM(userId: string, content: string): Promise<boolean> {
  const { botToken } = await getDiscordCredentials();
  if (!botToken) return false;

  const channelId = await openDmChannel(botToken, userId);
  if (!channelId) return false;

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a message to the configured admin Discord webhook. */
export async function sendAdminDiscordMessage(content: string): Promise<boolean> {
  const { webhookUrl } = await getDiscordCredentials();
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Check whether the notification preference `prefKey` is enabled for an account.
 * Defaults to true (opt-in) for all keys, mirroring parsePrefKey in telegram.ts.
 * Uses telegramNotifications JSON column so Discord honours the same user prefs.
 */
function checkPref(prefs: unknown, prefKey: string): boolean {
  if (!prefs || typeof prefs !== "object") return true;
  const p = prefs as Record<string, unknown>;
  return typeof p[prefKey] === "boolean" ? (p[prefKey] as boolean) : true;
}

/**
 * Send a Discord DM to a user identified by their telegramUsername.
 * Respects the same notification preference (prefKey) as Telegram.
 * Looks up their discord_id, converts HTML text to plain text, and sends.
 * Best-effort — failures are silently ignored.
 */
export async function notifyUserDiscord(telegramUsername: string, prefKey: string, htmlText: string): Promise<void> {
  try {
    const bare = telegramUsername.replace(/^@/, "").toLowerCase();
    const [account] = await db
      .select({
        discordId: accountsTable.discordId,
        telegramNotifications: accountsTable.telegramNotifications,
        discordRefreshToken: accountsTable.discordRefreshToken,
        discordTokenExpiresAt: accountsTable.discordTokenExpiresAt,
      })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, bare));

    if (!account?.discordId) return;

    // Respect the same notification preference the user set for Telegram
    if (!checkPref(account.telegramNotifications, prefKey)) return;

    // Refresh the OAuth token if it is within 24h of expiry or already expired
    if (account.discordRefreshToken) {
      const expiresAt = account.discordTokenExpiresAt ? new Date(account.discordTokenExpiresAt).getTime() : 0;
      const needsRefresh = expiresAt - Date.now() < DISCORD_TOKEN_REFRESH_WINDOW_MS;
      if (needsRefresh) {
        await refreshDiscordToken(bare, account.discordRefreshToken);
      }
    }

    // Convert HTML to plain text for Discord
    const plain = htmlText
      .replace(/<b>(.*?)<\/b>/gi, "**$1**")
      .replace(/<i>(.*?)<\/i>/gi, "_$1_")
      .replace(/<code>(.*?)<\/code>/gi, "`$1`")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim();

    // Discord message limit is 2000 chars
    const truncated = plain.length > 1900 ? plain.slice(0, 1900) + "…" : plain;

    await sendDiscordDM(account.discordId, truncated);
  } catch {
    // Best-effort — never throw
  }
}

// ── Discord Bot status ───────────────────────────────────────────────────────

export async function getDiscordBotStatus(): Promise<{
  configured: boolean;
  botUsername?: string;
  webhookConfigured: boolean;
}> {
  const { botToken, webhookUrl } = await getDiscordCredentials();
  if (!botToken) return { configured: false, webhookConfigured: !!webhookUrl };

  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { configured: true, webhookConfigured: !!webhookUrl };
    const data = await res.json() as { username: string; discriminator: string };
    const botUsername = data.discriminator === "0" ? data.username : `${data.username}#${data.discriminator}`;
    return { configured: true, botUsername, webhookConfigured: !!webhookUrl };
  } catch {
    return { configured: true, webhookConfigured: !!webhookUrl };
  }
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function buildDiscordAuthUrl(redirectUri: string, state: string, scopes = ["identify", "email"]): string {
  const clientId = process.env["DISCORD_CLIENT_ID"] ?? "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env["DISCORD_CLIENT_ID"] ?? "";
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"] ?? "";
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  } catch {
    return null;
  }
}

export async function fetchDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  avatar: string | null;
} | null> {
  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json() as { id: string; username: string; avatar: string | null };
  } catch {
    return null;
  }
}

/**
 * Refresh a Discord OAuth2 access token for the given account (identified by
 * telegramUsername). Calls /oauth2/token with grant_type=refresh_token and
 * persists the new access_token, refresh_token, and expires_at back to the DB.
 *
 * Returns the new access token on success, null on failure.
 */
export async function refreshDiscordToken(
  telegramUsername: string,
  refreshToken: string,
): Promise<string | null> {
  const clientId = process.env["DISCORD_CLIENT_ID"] ?? "";
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"] ?? "";
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db
      .update(accountsTable)
      .set({
        discordAccessToken: data.access_token,
        discordRefreshToken: data.refresh_token,
        discordTokenExpiresAt: expiresAt,
      })
      .where(eq(accountsTable.telegramUsername, telegramUsername));

    return data.access_token;
  } catch {
    return null;
  }
}
