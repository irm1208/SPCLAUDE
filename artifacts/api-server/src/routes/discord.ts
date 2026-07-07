import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { accountsTable, siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getJwtSecret, issueAccountCookie, requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import {
  getDiscordCredentials,
  invalidateDiscordCache,
  getDiscordBotStatus,
  sendAdminDiscordMessage,
  buildDiscordAuthUrl,
  exchangeDiscordCode,
  fetchDiscordUser,
} from "../lib/discord";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOAuthRedirectUri(req: Request): string {
  const configured = process.env["DISCORD_REDIRECT_URI"] ?? "";
  if (configured) return configured;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = req.headers["host"] ?? "localhost";
  return `${proto}://${host}/api/account/discord/oauth-callback`;
}

function signState(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: 600 }); // 10 min
}

function verifyState(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, getJwtSecret()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Connect flow (existing account links Discord) ─────────────────────────────

// GET /api/account/discord/auth-url — return OAuth URL for linking Discord to existing account
router.get("/account/discord/auth-url", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  if (!process.env["DISCORD_CLIENT_ID"]) {
    res.status(503).json({ error: "Discord OAuth is not configured (DISCORD_CLIENT_ID missing)" });
    return;
  }
  const redirectUri = getOAuthRedirectUri(req);
  const state = signState({ action: "connect", tg });
  const url = buildDiscordAuthUrl(redirectUri, state);
  res.json({ url });
});

// POST /api/account/discord/disconnect — unlink Discord from account
router.post("/account/discord/disconnect", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  await db.update(accountsTable)
    .set({
      discordId: null,
      discordUsername: null,
      discordAvatar: null,
      discordAccessToken: null,
      discordRefreshToken: null,
      discordTokenExpiresAt: null,
    })
    .where(eq(accountsTable.telegramUsername, tg));
  res.json({ ok: true });
});

// GET /api/account/discord/status — get linked Discord info
router.get("/account/discord/status", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const [account] = await db
    .select({
      discordId: accountsTable.discordId,
      discordUsername: accountsTable.discordUsername,
      discordAvatar: accountsTable.discordAvatar,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  res.json({
    linked: !!account.discordId,
    discordUsername: account.discordUsername ?? null,
    discordAvatar: account.discordAvatar ?? null,
    discordId: account.discordId ?? null,
  });
});

// ── Login flow (log in / sign up via Discord) ─────────────────────────────────

// GET /api/account/discord/login-url — return OAuth URL for Discord login/signup
router.get("/account/discord/login-url", async (req, res): Promise<void> => {
  if (!process.env["DISCORD_CLIENT_ID"]) {
    res.status(503).json({ error: "Discord OAuth is not configured" });
    return;
  }
  const redirectUri = getOAuthRedirectUri(req);
  const state = signState({ action: "login" });
  const url = buildDiscordAuthUrl(redirectUri, state);
  res.json({ url });
});

// GET /api/account/discord/oauth-callback — Discord redirects here after auth
// This is the single OAuth redirect URI registered in the Discord dev portal.
router.get("/account/discord/oauth-callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;

  // access_denied can mean two things:
  // 1. We used prompt=none and the user hasn't authorized the app yet → retry with consent screen
  // 2. We used prompt=consent and the user clicked Cancel → show error
  // Distinguish by checking whether firstAuth=true is in the signed state.
  if (error === "access_denied" && state) {
    const stateData = verifyState(state);
    if (!stateData?.firstAuth) {
      // First-timer hit prompt=none — send them to the consent screen once
      const action = (stateData?.action as string) ?? "login";
      const redirectUri = getOAuthRedirectUri(req);
      const newState = signState({ action, firstAuth: true });
      const url = buildDiscordAuthUrl(redirectUri, newState, ["identify"], "consent");
      res.redirect(url);
      return;
    }
    // User actually clicked Cancel on the consent screen
    const dest = (stateData?.action as string) === "connect"
      ? `/account?s=telegram&discord_error=${encodeURIComponent("Discord authorisation was cancelled")}`
      : `/login?discord_error=${encodeURIComponent("Discord authorisation was cancelled")}`;
    res.redirect(dest);
    return;
  }

  if (error) {
    res.redirect(`/login?discord_error=${encodeURIComponent("Discord authorisation was cancelled")}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`/login?discord_error=${encodeURIComponent("Missing OAuth parameters")}`);
    return;
  }

  const stateData = verifyState(state);
  if (!stateData) {
    res.redirect(`/login?discord_error=${encodeURIComponent("Invalid or expired link — please try again")}`);
    return;
  }

  const action = stateData.action as string;
  const redirectUri = getOAuthRedirectUri(req);

  const tokens = await exchangeDiscordCode(code, redirectUri);
  if (!tokens) {
    const dest = action === "connect"
      ? `/account?s=telegram&discord_error=${encodeURIComponent("Failed to exchange OAuth code — please try again")}`
      : `/login?discord_error=${encodeURIComponent("Failed to exchange OAuth code — please try again")}`;
    res.redirect(dest);
    return;
  }

  const discordUser = await fetchDiscordUser(tokens.access_token);
  if (!discordUser) {
    const dest = action === "connect"
      ? `/account?s=telegram&discord_error=${encodeURIComponent("Failed to fetch Discord profile")}`
      : `/login?discord_error=${encodeURIComponent("Failed to fetch Discord profile")}`;
    res.redirect(dest);
    return;
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // ── CONNECT: link Discord to existing logged-in account ───────────────────
  if (action === "connect") {
    const tg = stateData.tg as string | undefined;
    if (!tg) {
      res.redirect(`/account?s=telegram&discord_error=${encodeURIComponent("Session expired — please try again")}`);
      return;
    }

    // Ensure discord_id isn't already linked to a different account
    const [existing] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(eq(accountsTable.discordId, discordUser.id));

    if (existing && existing.telegramUsername !== tg) {
      res.redirect(`/account?s=telegram&discord_error=${encodeURIComponent("This Discord account is already linked to another user")}`);
      return;
    }

    await db.update(accountsTable)
      .set({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
        discordTokenExpiresAt: expiresAt,
      })
      .where(eq(accountsTable.telegramUsername, tg));

    res.redirect(`/account?s=telegram&discord_ok=1`);
    return;
  }

  // ── LOGIN: find or create account via Discord ─────────────────────────────
  if (action === "login") {
    // Look up by discord_id
    const [byDiscord] = await db
      .select({ telegramUsername: accountsTable.telegramUsername, accountStatus: accountsTable.accountStatus })
      .from(accountsTable)
      .where(eq(accountsTable.discordId, discordUser.id));

    if (byDiscord) {
      if (byDiscord.accountStatus === "suspended") {
        res.redirect(`/login?discord_error=${encodeURIComponent("This account has been suspended")}`);
        return;
      }
      // Refresh tokens
      await db.update(accountsTable)
        .set({
          discordAccessToken: tokens.access_token,
          discordRefreshToken: tokens.refresh_token,
          discordTokenExpiresAt: expiresAt,
          discordUsername: discordUser.username,
          discordAvatar: discordUser.avatar,
          lastLoginAt: new Date(),
        })
        .where(eq(accountsTable.telegramUsername, byDiscord.telegramUsername));

      issueAccountCookie(res, byDiscord.telegramUsername);
      res.redirect("/account");
      return;
    }

    // No account found — create one with synthetic username discord:<id>
    const syntheticUsername = `discord:${discordUser.id}`;

    const [clash] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, syntheticUsername));

    if (clash) {
      // Exists but discordId wasn't set — update it
      await db.update(accountsTable)
        .set({
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordAvatar: discordUser.avatar,
          discordAccessToken: tokens.access_token,
          discordRefreshToken: tokens.refresh_token,
          discordTokenExpiresAt: expiresAt,
          lastLoginAt: new Date(),
        })
        .where(eq(accountsTable.telegramUsername, syntheticUsername));
    } else {
      await db.insert(accountsTable).values({
        telegramUsername: syntheticUsername,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
        discordTokenExpiresAt: expiresAt,
        accountStatus: "active",
        lastLoginAt: new Date(),
      });
    }

    issueAccountCookie(res, syntheticUsername);
    res.redirect("/account");
    return;
  }

  res.redirect(`/login?discord_error=${encodeURIComponent("Unknown OAuth action")}`);
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

// GET /api/admin/discord/status
router.get("/admin/discord/status", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  getDiscordBotStatus().then(status => res.json(status)).catch(() => res.status(500).json({ error: "Failed to check status" }));
});

// POST /api/admin/discord/test-webhook
router.post("/admin/discord/test-webhook", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  sendAdminDiscordMessage("🧪 **Salt\u0026Peps Admin Test** — Discord webhook is working correctly!")
    .then(ok => {
      if (ok) { res.json({ ok: true }); } else { res.status(500).json({ error: "Webhook delivery failed — check the URL is correct" }); }
    })
    .catch(() => res.status(500).json({ error: "Failed to send test message" }));
});

// POST /api/admin/discord/save-config
router.post("/admin/discord/save-config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { botToken, webhookUrl } = req.body as { botToken?: string; webhookUrl?: string };

  if (botToken !== undefined) {
    await db.insert(siteConfigTable).values({ key: "discordBotToken", value: botToken.trim() })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: botToken.trim() } });
  }
  if (webhookUrl !== undefined) {
    await db.insert(siteConfigTable).values({ key: "discordAdminWebhookUrl", value: webhookUrl.trim() })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: webhookUrl.trim() } });
  }
  invalidateDiscordCache();
  res.json({ ok: true });
});

// GET /api/admin/discord/config — fetch current saved config (values redacted)
router.get("/admin/discord/config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { botToken, webhookUrl } = await getDiscordCredentials();
  res.json({
    botTokenSet: !!botToken,
    webhookUrlSet: !!webhookUrl,
    // Show last 8 chars of webhook URL for identification, fully mask bot token
    webhookUrlHint: webhookUrl ? `…${webhookUrl.slice(-20)}` : null,
  });
});

export default router;
