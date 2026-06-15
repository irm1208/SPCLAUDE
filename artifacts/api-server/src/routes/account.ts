import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { db } from "@workspace/db";
import { accountsTable, accountGroupBuysTable, groupBuysTable, ordersTable, orderLineItemsTable, orderDispatchImagesTable, customersTable, bloodTestSessionsTable, compoundLogsTable, gbWaitlistTable, poolParticipantsTable, testingPoolsTable, productsTable, labTestsTable, gbReshippersTable, gbCountryLegsTable, ruleAcceptancesTable, siteConfigTable, creditTransactionsTable, lookupAttemptsTable, blockedIpsTable, inviteCodesTable, gbParcelsTable } from "@workspace/db";
import { eq, and, or, desc, sql, isNull, isNotNull, gt, inArray } from "drizzle-orm";
import { randomUUID, createHash, randomInt } from "crypto";
import { requireAccount, issueAccountCookie, revokeToken, extractJtiFromCookie } from "../middleware/account-auth";
import { writeLog } from "../lib/audit-log";
import { notifyUser, sendTelegramMessage, sendAdminMessage, notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { createAlert } from "../lib/create-alert";
import { normalizeTg } from "../lib/normalize";
import { logCustomerActivity } from "../lib/activity-log";
import { resolveOrderCrypto, verifyTransaction, toUsdIfGbp, isValidTxHash, type OrganiserPayments } from "./payments";

const BALANCE_ANON_PAY_PREFIX = "anonpay:";

// ── Multer: receive QR/label files as binary multipart uploads ─────────────
const _qrMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("File must be an image (PNG/JPEG/WebP) or PDF"));
    }
  },
}).single("file");

function qrUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  _qrMulter(req, res, (err) => {
    if (!err) { next(); return; }
    const msg = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
      ? "File is too large. Maximum size is 10 MB."
      : (err as Error).message || "File upload error";
    res.status(400).json({ error: msg });
  });
}

async function getSiteConfig(key: string): Promise<string | null> {
  const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

const router: IRouter = Router();

/**
 * When the parent group buy is in status "closed", returns true if the named
 * customer action ("address" or "delete") has been disabled via the
 * `allow_*_when_closed` flags. Returns false for orphan/non-GB orders or when
 * the GB is not closed.
 */
type CustomerAccountAction = "address" | "delete";
async function isCustomerActionLockedByGb(
  groupBuyId: string | null | undefined,
  action: CustomerAccountAction,
): Promise<boolean> {
  if (!groupBuyId) return false;
  const [parentGb] = await db
    .select({
      status: groupBuysTable.status,
      allowEditAddressWhenClosed: groupBuysTable.allowEditAddressWhenClosed,
      allowDeleteOrderWhenClosed: groupBuysTable.allowDeleteOrderWhenClosed,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));
  if (!parentGb || parentGb.status !== "closed") return false;
  if (action === "address") return !parentGb.allowEditAddressWhenClosed;
  return !parentGb.allowDeleteOrderWhenClosed;
}

const MAX_TG_LENGTH = 64;
const BCRYPT_ROUNDS = 12;

// Login rate-limiting constants
const LOGIN_MAX_FAILURES = 15;
const LOGIN_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// POST /api/account/signup
// Creates a new account OR allows an admin-pre-created account (passwordHash = null) to set their password.
router.post("/account/signup", async (req, res): Promise<void> => {
  const { telegramUsername, password, email, country, inviteCode } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one number or special character" });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }
  if (!country || typeof country !== "string" || country.trim().length === 0) {
    res.status(400).json({ error: "Country is required" });
    return;
  }

  // Check invite code requirement
  const [rawRequiresInvite] = await db.select({ value: siteConfigTable.value })
    .from(siteConfigTable).where(eq(siteConfigTable.key, "signup_requires_invite"));
  const signupRequiresInvite = rawRequiresInvite?.value === "true";

  const providedCode = typeof inviteCode === "string" ? inviteCode.trim().toUpperCase() : null;

  let resolvedInviteCode: string | null = null;
  if (signupRequiresInvite) {
    if (!providedCode) {
      res.status(400).json({ error: "An invite code is required to sign up" });
      return;
    }
    const [codeRow] = await db.select().from(inviteCodesTable)
      .where(eq(inviteCodesTable.code, providedCode));
    if (!codeRow || !codeRow.isActive) {
      res.status(400).json({ error: "Invalid or inactive invite code" });
      return;
    }
    if (codeRow.maxUses !== null && codeRow.usageCount >= codeRow.maxUses) {
      res.status(400).json({ error: "This invite code has reached its usage limit" });
      return;
    }
    resolvedInviteCode = codeRow.code;
  } else if (providedCode) {
    // Code provided but not required — validate it if it exists, record it if valid
    const [codeRow] = await db.select().from(inviteCodesTable)
      .where(eq(inviteCodesTable.code, providedCode));
    if (codeRow && codeRow.isActive && (codeRow.maxUses === null || codeRow.usageCount < codeRow.maxUses)) {
      resolvedInviteCode = codeRow.code;
    }
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg || tg.length < 2 || tg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  const [existing] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, passwordHash: accountsTable.passwordHash })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (existing) {
    if (existing.passwordHash != null) {
      res.status(409).json({ error: "An account with this Telegram username already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(accountsTable)
      .set({ passwordHash, email: email.trim().toLowerCase(), country: country.trim(), ...(resolvedInviteCode ? { signupInviteCode: resolvedInviteCode } : {}) })
      .where(eq(accountsTable.telegramUsername, tg));

    if (resolvedInviteCode) {
      await db.update(inviteCodesTable)
        .set({ usageCount: sql`${inviteCodesTable.usageCount} + 1` })
        .where(eq(inviteCodesTable.code, resolvedInviteCode));
    }

    issueAccountCookie(res, tg);

    writeLog("login", "info", "account_password_set",
      `Password set for pre-created account: ${tg}`,
      { telegramUsername: tg },
      req.ip,
    ).catch(() => {});

    res.status(200).json({ ok: true, telegramUsername: tg });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.insert(accountsTable).values({
    telegramUsername: tg,
    passwordHash,
    email: email.trim().toLowerCase(),
    accountStatus: "active",
    country: country.trim(),
    ...(resolvedInviteCode ? { signupInviteCode: resolvedInviteCode } : {}),
  });

  if (resolvedInviteCode) {
    await db.update(inviteCodesTable)
      .set({ usageCount: sql`${inviteCodesTable.usageCount} + 1` })
      .where(eq(inviteCodesTable.code, resolvedInviteCode));
  }

  issueAccountCookie(res, tg);

  writeLog("login", "info", "account_signup",
    `New account created: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  await logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "account",
    eventType: "account.created",
    actorType: "customer",
    metadata: { telegramUsername: tg, registrationTimestamp: new Date().toISOString() },
  }).catch(err => console.error("[account] account.created log failed:", err));

  createAlert("customer", "high", "New Customer",
    `New account registered: @${tg.replace(/^@/, "")}`,
    { linkUrl: `#customers:${tg}` },
  ).catch(() => {});

  sendAdminFromTemplate("admin_new_account",
    { username: tg.replace(/^@/, "") },
  ).catch(() => {});

  res.status(201).json({ ok: true, telegramUsername: tg });
});

// POST /api/account/login
router.post("/account/login", async (req, res): Promise<void> => {
  const { telegramUsername, password } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  // Use a constant-time compare even when no hash exists to prevent timing attacks
  const storedHash = account?.passwordHash ?? "$2b$12$invalidhashpadding000000000000000000000000000";
  const valid = await bcrypt.compare(password, storedHash);

  if (!account || !account.passwordHash || !valid) {
    writeLog("login", "warn", "account_login_failed",
      `Failed login attempt for: ${tg}`,
      { telegramUsername: tg },
      req.ip,
    ).catch(() => {});
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  if (account.accountStatus !== "active") {
    res.status(403).json({ error: "Account is not active" });
    return;
  }

  issueAccountCookie(res, tg);

  db.update(accountsTable).set({ lastLoginIp: req.ip ?? null, lastLoginAt: new Date() })
    .where(eq(accountsTable.telegramUsername, tg)).catch(() => {});

  writeLog("login", "info", "account_login",
    `Account login: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, telegramUsername: tg });
});

// POST /api/account/logout
router.post("/account/logout", async (req, res): Promise<void> => {
  // Revoke the current JWT so it cannot be replayed even before it expires
  const tokenInfo = extractJtiFromCookie(req);
  if (tokenInfo) {
    await revokeToken(tokenInfo.jti, tokenInfo.expiresAt).catch(() => {});
  }
  res.clearCookie("account_session", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ ok: true });
});

// GET /api/account/me
router.get("/account/me", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  const [acct] = await db
    .select({
      healthDataConsent: accountsTable.healthDataConsent,
      organiserStatus: accountsTable.organiserStatus,
      reshipperStatus: accountsTable.reshipperStatus,
      country: accountsTable.country,
      addressLine1: accountsTable.addressLine1,
      addressLine2: accountsTable.addressLine2,
      addressCity: accountsTable.addressCity,
      addressPostcode: accountsTable.addressPostcode,
      addressPhone: accountsTable.addressPhone,
      addressPhonePrefix: accountsTable.addressPhonePrefix,
      credits: accountsTable.credits,
      isWholesale: accountsTable.isWholesale,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  const memberships = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      joinedAt: accountGroupBuysTable.joinedAt,
    })
    .from(accountGroupBuysTable)
    .innerJoin(groupBuysTable, eq(accountGroupBuysTable.groupBuyId, groupBuysTable.id))
    .where(eq(accountGroupBuysTable.accountId, tg));

  // Ruleset version data
  const [ruleVersionRow] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "ruleset_version"));
  const rulesetVersion = ruleVersionRow?.value ? parseInt(ruleVersionRow.value, 10) : 1;
  const [latestAcceptance] = await db.select({ version: ruleAcceptancesTable.version }).from(ruleAcceptancesTable)
    .where(sql`lower(${ruleAcceptancesTable.accountId}) = ${normalizeTg(tg)}`).orderBy(desc(ruleAcceptancesTable.version)).limit(1);
  const ruleAcceptedVersion = latestAcceptance?.version ?? null;

  res.json({
    telegramUsername: tg,
    healthDataConsent: acct?.healthDataConsent ?? false,
    organiserStatus: acct?.organiserStatus ?? null,
    reshipperStatus: acct?.reshipperStatus ?? null,
    country: acct?.country ?? null,
    addressLine1: acct?.addressLine1 ?? null,
    addressLine2: acct?.addressLine2 ?? null,
    addressCity: acct?.addressCity ?? null,
    addressPostcode: acct?.addressPostcode ?? null,
    addressPhone: acct?.addressPhone ?? null,
    addressPhonePrefix: acct?.addressPhonePrefix ?? null,
    credits: acct?.credits ?? 0,
    isWholesale: acct?.isWholesale ?? false,
    groupBuys: memberships,
    rulesetVersion,
    ruleAcceptedVersion,
  });
});

// POST /api/account/join-gb
// Accepts { groupBuyId, invitePin?, countryCode?, countryLegInvite? }.
// Idempotent: already-members always succeed regardless of PIN.
// invitePin is required only when the caller is not already a member.
// countryCode + countryLegInvite are required when the GB has countryLegsEnabled=true
// and the selected country's leg has inviteEnabled=true.
router.post("/account/join-gb", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const {
    groupBuyId: rawGroupBuyId,
    invitePin: rawInvitePin,
    countryCode: rawCountryCode,
    countryLegInvite: rawCountryLegInvite,
  } = req.body;

  if (!rawGroupBuyId || typeof rawGroupBuyId !== "string") {
    res.status(400).json({ error: "groupBuyId is required" });
    return;
  }

  // Enforce ruleset acceptance before joining any GB
  const [versionRow] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "ruleset_version"));
  const currentVersion = parseInt(versionRow?.value ?? "1", 10);
  const [accepted] = await db.select({ version: ruleAcceptancesTable.version }).from(ruleAcceptancesTable)
    .where(and(sql`lower(${ruleAcceptancesTable.accountId}) = ${tg}`, eq(ruleAcceptancesTable.version, currentVersion)));
  if (!accepted) {
    res.status(403).json({ error: "You must accept the membership rules before joining a group buy.", code: "RULES_NOT_ACCEPTED" });
    return;
  }

  const groupBuyId = rawGroupBuyId.trim();
  const invitePin = typeof rawInvitePin === "string" ? rawInvitePin.trim() : rawInvitePin;
  const countryCode = typeof rawCountryCode === "string" ? rawCountryCode.trim().toUpperCase() : null;
  const countryLegInvite = typeof rawCountryLegInvite === "string" ? rawCountryLegInvite.trim().toUpperCase().replace(/\s/g, "") : null;

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      status: groupBuysTable.status,
      invitePinHash: groupBuysTable.invitePinHash,
      memberLimit: groupBuysTable.memberLimit,
      allowedCountries: groupBuysTable.allowedCountries,
      excludedCountries: groupBuysTable.excludedCountries,
      countryLegsEnabled: groupBuysTable.countryLegsEnabled,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));

  if (!gb || gb.status === "archived") {
    res.status(403).json({ error: "Group buy not found" });
    return;
  }

  // Check existing membership first — if already a member, succeed idempotently (no PIN needed)
  const existing = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(
      eq(accountGroupBuysTable.accountId, tg),
      eq(accountGroupBuysTable.groupBuyId, gb.id),
    ));

  if (existing.length > 0) {
    res.json({ ok: true, groupBuyId: gb.id });
    return;
  }

  // Check country restrictions
  // accounts table uses bare usernames (no "@"); tg may have a leading "@" — strip it.
  const bareTg = tg.replace(/^@/, "");
  const [userAcct] = await db
    .select({ country: accountsTable.country })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, bareTg));
  // Normalise stored country: ISO-2 codes (e.g. "GB") are expanded to full names
  // so they match the full-name strings stored in allowedCountries / excludedCountries.
  const rawUserCountry = userAcct?.country ?? null;
  const userCountry = rawUserCountry
    ? (({
        GB: "United Kingdom", IE: "Ireland", BE: "Belgium", NL: "Netherlands",
        LU: "Luxembourg", DE: "Germany", AT: "Austria", FR: "France",
        ES: "Spain", PT: "Portugal", IT: "Italy", SE: "Sweden", DK: "Denmark",
        FI: "Finland", NO: "Norway", EE: "Estonia", LV: "Latvia", LT: "Lithuania",
        PL: "Poland", CZ: "Czech Republic", SK: "Slovakia", HU: "Hungary",
        RO: "Romania", BG: "Bulgaria", HR: "Croatia", SI: "Slovenia",
        GR: "Greece", CY: "Cyprus", MT: "Malta", CH: "Switzerland",
        US: "United States", CA: "Canada", AU: "Australia",
      } as Record<string, string>)[rawUserCountry.trim().toUpperCase()] ?? rawUserCountry.trim())
    : null;

  if (gb.allowedCountries && gb.allowedCountries.length > 0) {
    if (!userCountry) {
      res.status(403).json({ error: "Please set your country in your profile before joining this group buy." });
      return;
    }
    if (!gb.allowedCountries.includes(userCountry)) {
      res.status(403).json({ error: `This group buy is only available to members in: ${gb.allowedCountries.join(", ")}` });
      return;
    }
  }
  if (gb.excludedCountries && gb.excludedCountries.length > 0) {
    if (!userCountry) {
      res.status(403).json({ error: "Please set your country in your profile before joining this group buy." });
      return;
    }
    if (gb.excludedCountries.includes(userCountry)) {
      res.status(403).json({ error: `This group buy is not available in your country (${userCountry})` });
      return;
    }
  }

  // Check member limit before allowing new joins
  if (gb.memberLimit != null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountGroupBuysTable)
      .where(eq(accountGroupBuysTable.groupBuyId, gb.id));
    if (count >= gb.memberLimit) {
      // Auto-enqueue on waitlist (ignore if already there)
      const existingWaitlist = await db
        .select({ id: gbWaitlistTable.id })
        .from(gbWaitlistTable)
        .where(and(eq(gbWaitlistTable.groupBuyId, gb.id), eq(gbWaitlistTable.accountId, tg)));
      if (existingWaitlist.length === 0) {
        await db.insert(gbWaitlistTable).values({ id: randomUUID(), groupBuyId: gb.id, accountId: tg });
      }
      res.status(403).json({ error: "This group buy is full. You have been added to the waitlist." });
      return;
    }
  }

  // ── Country leg validation ────────────────────────────────────────────────
  let resolvedCountryLegId: string | null = null;
  if (gb.countryLegsEnabled) {
    if (!countryCode) {
      res.status(400).json({ error: "Please select your country to join this group buy" });
      return;
    }
    const [leg] = await db
      .select()
      .from(gbCountryLegsTable)
      .where(and(
        eq(gbCountryLegsTable.gbId, gb.id),
        eq(gbCountryLegsTable.countryCode, countryCode),
      ));
    if (!leg || leg.status === "closed") {
      res.status(403).json({ error: `This group buy is not currently available for ${countryCode}` });
      return;
    }
    if (leg.inviteEnabled) {
      if (!countryLegInvite) {
        res.status(403).json({ error: "An invite code is required to join this country group" });
        return;
      }
      const normalized = countryLegInvite.replace(/-/g, "");
      const expectedNorm = (leg.inviteCode ?? "").toUpperCase().replace(/-/g, "");
      if (!expectedNorm || normalized !== expectedNorm) {
        res.status(403).json({ error: "Invalid invite code for this country group" });
        return;
      }
    }
    resolvedCountryLegId = leg.id;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Not yet a member — check if this group buy requires a PIN
  if (!gb.invitePinHash) {
    // No PIN set — anyone with the group buy ID can join freely
    await db.insert(accountGroupBuysTable).values({
      id: randomUUID(),
      accountId: tg,
      groupBuyId: gb.id,
      countryLegId: resolvedCountryLegId,
    });
    res.json({ ok: true, groupBuyId: gb.id });
    return;
  }

  // PIN-protected — must supply a valid PIN
  if (!invitePin || typeof invitePin !== "string") {
    res.status(403).json({ error: "An invite PIN is required to join this group buy" });
    return;
  }

  const pinValid = await bcrypt.compare(invitePin, gb.invitePinHash);
  if (!pinValid) {
    res.status(403).json({ error: "Invalid invite PIN" });
    return;
  }

  await db.insert(accountGroupBuysTable).values({
    id: randomUUID(),
    accountId: tg,
    groupBuyId: gb.id,
    countryLegId: resolvedCountryLegId,
  });

  const [gbInfo] = await db.select({ name: groupBuysTable.name, status: groupBuysTable.status }).from(groupBuysTable).where(eq(groupBuysTable.id, gb.id));
  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "group_buy",
    eventType: "group_buy.joined",
    entityId: gb.id,
    actorType: "customer",
    metadata: { groupBuyId: gb.id, groupBuyName: gbInfo?.name ?? null, phase: gbInfo?.status ?? null },
  }).catch(() => {});

  res.json({ ok: true, groupBuyId: gb.id });
});

// DELETE /api/account/group-buys/:gbId/leave
router.delete("/account/group-buys/:gbId/leave", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const gbId = String(req.params["gbId"]);

  const membership = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(
      eq(accountGroupBuysTable.accountId, tg),
      eq(accountGroupBuysTable.groupBuyId, gbId),
    ));

  if (membership.length === 0) {
    res.status(404).json({ error: "You are not a member of this group buy" });
    return;
  }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  // Snapshot orders before deleting so we have a full audit trail
  const ordersToDelete = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.groupBuyId, gbId),
      sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
    )
  );
  const lineItemSnapshots = await Promise.all(
    ordersToDelete.map(o =>
      db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, o.id))
    )
  );

  await db.update(ordersTable)
    .set({ deletedAt: new Date(), deletedBy: "leave_gb" })
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  // Log each deleted order individually
  for (let i = 0; i < ordersToDelete.length; i++) {
    const o = ordersToDelete[i];
    const lis = lineItemSnapshots[i] ?? [];
    writeLog("order", "warn", "order_deleted_by_leave_gb",
      `Order ${o.code} (${o.telegramUsername}, status: ${o.status}) deleted when member left group buy ${gbId}`,
      {
        orderId: o.id,
        code: o.code,
        groupBuyId: gbId,
        telegramUsername: o.telegramUsername,
        status: o.status,
        snapshot: {
          deliveryMethod: o.deliveryMethod,
          grandTotal: o.grandTotal,
          lineItems: lis.map(li => ({ productName: li.productName, quantity: li.quantity })),
        },
      },
      req.ip ?? undefined,
    ).catch(() => {});
  }

  await db.delete(accountGroupBuysTable).where(
    and(
      eq(accountGroupBuysTable.accountId, tg),
      eq(accountGroupBuysTable.groupBuyId, gbId),
    )
  );

  writeLog("change", "info", "account_left_gb",
    `Account ${tg} left group buy ${gbId}`,
    { telegramUsername: tg, groupBuyId: gbId, ordersDeleted: ordersToDelete.length },
    req.ip,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "group_buy",
    eventType: "group_buy.left",
    entityId: gbId,
    actorType: "customer",
    metadata: { groupBuyId: gbId },
  }).catch(() => {});

  res.json({ ok: true });
});

// POST /api/account/accept-rules — records acceptance of the current ruleset version
router.post("/account/accept-rules", requireAccount, async (req, res): Promise<void> => {
  const tg = normalizeTg(req.account!.telegramUsername);
  const [ruleVersionRow] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "ruleset_version"));
  const currentVersion = ruleVersionRow?.value ? parseInt(ruleVersionRow.value, 10) : 1;
  await db.insert(ruleAcceptancesTable).values({ id: randomUUID(), accountId: tg, version: currentVersion }).onConflictDoNothing();
  res.json({ ok: true, version: currentVersion });
});

// POST /api/account/use-credits — deduct credits from account balance when paying for an order
router.post("/account/use-credits", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { amount, orderId } = req.body as { amount?: number; orderId?: string };
  if (!amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" }); return;
  }
  const [acct] = await db.select({ credits: accountsTable.credits })
    .from(accountsTable).where(eq(accountsTable.telegramUsername, tg));
  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }
  const deduct = Math.min(acct.credits, Math.floor(amount));
  if (deduct <= 0) { res.json({ ok: true, deducted: 0, remaining: acct.credits }); return; }
  const newBalance = acct.credits - deduct;
  await db.update(accountsTable).set({ credits: newBalance }).where(eq(accountsTable.telegramUsername, tg));
  // Look up order code for a human-readable transaction reason
  let orderCode: string | null = null;
  if (orderId) {
    const [orderRow] = await db.select({ code: ordersTable.code, grandTotal: ordersTable.grandTotal, paymentStatus: ordersTable.paymentStatus })
      .from(ordersTable).where(eq(ordersTable.id, orderId));
    if (orderRow) {
      orderCode = orderRow.code;
      // Stamp credits_applied on the order
      await db.update(ordersTable)
        .set({ creditsApplied: deduct })
        .where(eq(ordersTable.id, orderId));
      // If credits fully cover the order, mark it as confirmed.
      // Credits are whole-dollar integers, so a $30.99 order needs ≥31 credits to be
      // covered — compare against Math.ceil(grandTotal) rather than the raw float.
      if (Math.ceil(parseFloat(String(orderRow.grandTotal))) <= deduct && orderRow.paymentStatus !== "confirmed") {
        await db.update(ordersTable).set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), amountDue: "0.00" }).where(eq(ordersTable.id, orderId));
      }
    }
  }
  await db.insert(creditTransactionsTable).values({
    accountUsername: tg,
    amount: -deduct,
    reason: orderCode ? `Credits applied to order #${orderCode}` : (orderId ? `Credits applied to order #${orderId.slice(0, 8)}` : "Credits applied to order"),
    orderId: orderId ?? null,
    adminUsername: null,
    createdAt: new Date(),
  });
  res.json({ ok: true, deducted: deduct, remaining: newBalance });
});

router.put("/account/country", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { country } = req.body;

  if (!country || typeof country !== "string" || country.trim().length === 0) {
    res.status(400).json({ error: "Country is required" });
    return;
  }

  await db.update(accountsTable)
    .set({ country: country.trim() })
    .where(eq(accountsTable.telegramUsername, tg));

  res.json({ ok: true, country: country.trim() });
});

// PATCH /api/account/address — save structured shipping address fields
router.patch("/account/address", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { addressLine1, addressLine2, addressCity, addressPostcode, country, addressPhone, addressPhonePrefix } = req.body as {
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    country?: string;
    addressPhone?: string;
    addressPhonePrefix?: string;
  };

  const update: Partial<{
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    country: string | null;
    addressPhone: string | null;
    addressPhonePrefix: string | null;
  }> = {};
  if (addressLine1 !== undefined) update.addressLine1 = addressLine1?.trim() || null;
  if (addressLine2 !== undefined) update.addressLine2 = addressLine2?.trim() || null;
  if (addressCity !== undefined) update.addressCity = addressCity?.trim() || null;
  if (addressPostcode !== undefined) update.addressPostcode = addressPostcode?.trim() || null;
  if (country !== undefined) update.country = country?.trim() || null;
  if (addressPhone !== undefined) update.addressPhone = addressPhone?.trim() || null;
  if (addressPhonePrefix !== undefined) update.addressPhonePrefix = addressPhonePrefix?.trim() || null;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await db.update(accountsTable).set(update).where(eq(accountsTable.telegramUsername, tg));
  res.json({ ok: true, ...update });
});

// POST /api/account/order-login
// Sign in using Telegram username + order code. Issues an account session.
// Creates an account entry if one doesn't exist yet.
// Returns { ok, telegramUsername, needsPassword } — needsPassword=true means account has no password yet.
router.post("/account/order-login", async (req, res): Promise<void> => {
  const { telegramUsername, orderCode } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!orderCode || typeof orderCode !== "string") {
    res.status(400).json({ error: "Order number is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg || tg.length < 2 || tg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  // Find order by code — order username stored with @ prefix
  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(eq(ordersTable.code, orderCode.trim().toUpperCase()));

  if (!order) {
    // Constant time — don't reveal if order exists
    await bcrypt.hash("notfound", 4);
    res.status(401).json({ error: "Order not found or username incorrect" });
    return;
  }

  // Verify telegram username matches (orders stored with @ prefix, tg also has @)
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const orderTgBare = String(order.telegramUsername).replace(/^@/, "").toLowerCase();
  if (orderTgBare !== tgBare) {
    await bcrypt.hash("mismatch", 4);
    res.status(401).json({ error: "Order not found or username incorrect" });
    return;
  }

  // Only log in to an EXISTING account — never silently create one.
  // This prevents an order-code holder from claiming another person's username.
  const [existing] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, passwordHash: accountsTable.passwordHash, accountStatus: accountsTable.accountStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (!existing) {
    res.status(401).json({ error: "No account found for this username. Please sign up first." });
    return;
  }

  if (existing.accountStatus !== "active") {
    res.status(403).json({ error: "Account is not active" });
    return;
  }

  const needsPassword = !existing.passwordHash;

  issueAccountCookie(res, tg);

  db.update(accountsTable).set({ lastLoginIp: req.ip ?? null, lastLoginAt: new Date() })
    .where(eq(accountsTable.telegramUsername, tg)).catch(() => {});

  writeLog("login", "info", "account_order_login",
    `Order-based login for ${tg} using order ${orderCode.trim().toUpperCase()}`,
    { telegramUsername: tg, orderCode: orderCode.trim().toUpperCase(), needsPassword },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, telegramUsername: tg, needsPassword });
});

// POST /api/account/set-password
// Sets or changes the password for the currently logged-in account.
// If the account already has a password, `currentPassword` must be supplied and verified.
// If the account has no password yet (e.g. order-login), `currentPassword` is not required.
router.post("/account/set-password", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { password, currentPassword } = req.body;

  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    res.status(400).json({ error: "Password must contain at least one number or special character" });
    return;
  }

  const [existing] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, passwordHash: accountsTable.passwordHash })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  // If the account already has a password, require the current one
  if (existing?.passwordHash) {
    if (!currentPassword || typeof currentPassword !== "string") {
      res.status(400).json({ error: "Current password is required to change your password" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing) {
    await db.update(accountsTable)
      .set({ passwordHash })
      .where(eq(accountsTable.telegramUsername, tg));
  } else {
    await db.insert(accountsTable).values({
      telegramUsername: tg,
      passwordHash,
      accountStatus: "active",
    });
  }

  writeLog("login", "info", "account_password_changed",
    `Password changed for: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true });
});

// POST /api/account/change-username
// Changes the telegramUsername for the logged-in account.
// Requires current password for verification. Updates all related tables.
router.post("/account/change-username", requireAccount, async (req, res): Promise<void> => {
  const oldTg = req.account!.telegramUsername;
  const { newUsername, currentPassword } = req.body;

  if (!newUsername || typeof newUsername !== "string") {
    res.status(400).json({ error: "New username is required" });
    return;
  }
  const newTg = normalizeTg(newUsername);
  if (!newTg || newTg.length < 3 || newTg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Username must be between 3 and 64 characters" });
    return;
  }
  if (!/^[a-z0-9_]+$/.test(newTg)) {
    res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });
    return;
  }
  const oldTgBare = normalizeTg(oldTg);
  if (newTg === oldTgBare) {
    res.status(400).json({ error: "New username is the same as your current username" });
    return;
  }
  if (!currentPassword || typeof currentPassword !== "string") {
    res.status(400).json({ error: "Current password is required" });
    return;
  }

  const [existing] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, passwordHash: accountsTable.passwordHash })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, oldTg));

  if (!existing?.passwordHash) {
    res.status(400).json({ error: "No password set on this account" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const [conflict] = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, newTg));
  if (conflict) {
    res.status(409).json({ error: "That username is already taken" });
    return;
  }

  const oldTgWithAt = `@${oldTgBare}`;
  const newTgWithAt = `@${newTg}`;

  // Update accounts FIRST — FK constraints with onUpdate:cascade on child tables cascade automatically.
  // Non-FK username columns (organiser_id, reshipper_username etc.) are updated explicitly below.
  await db.execute(sql`UPDATE accounts SET telegram_username = ${newTg} WHERE telegram_username = ${oldTg}`);

  // Non-FK columns that store the username as plain text (must be updated explicitly).
  // All WHERE clauses match both @user and user formats via lower() IN (bare, @bare).
  await db.update(groupBuysTable).set({ organiserId: newTg }).where(eq(groupBuysTable.organiserId, oldTg));
  await db.update(productsTable).set({ organiserId: newTg }).where(eq(productsTable.organiserId, oldTg));
  await db.update(labTestsTable).set({ organiserId: newTg }).where(eq(labTestsTable.organiserId, oldTg));
  await db.update(gbReshippersTable).set({ reshipperUsername: newTg }).where(eq(gbReshippersTable.reshipperUsername, oldTg));
  await db.execute(sql`UPDATE orders SET reshipper_username = ${newTgWithAt} WHERE lower(reshipper_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE customers SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE orders SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE vial_orders SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE feedback SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE coupon_redemptions SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE health_insight_logs SET telegram_username = ${newTgWithAt} WHERE lower(telegram_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE customer_activity_logs SET actor_username = ${newTgWithAt} WHERE lower(actor_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE telegram_message_logs SET recipient_username = ${newTgWithAt} WHERE lower(recipient_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE pool_participants SET account_username = ${newTgWithAt} WHERE lower(account_username) IN (${oldTgBare}, ${oldTgWithAt})`);
  await db.execute(sql`UPDATE testing_pools SET leader_username = ${newTgWithAt} WHERE lower(leader_username) IN (${oldTgBare}, ${oldTgWithAt})`);

  issueAccountCookie(res, newTg);

  writeLog("login", "info", "account_username_changed",
    `Username changed: ${oldTgBare} → ${newTg}`,
    { telegramUsername: newTg },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, newUsername: newTg });
});

// PATCH /api/account/me
// Updates the display name (fullName) and/or email for the logged-in account.
router.patch("/account/me", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const tgWithAt = tg.startsWith("@") ? tg : `@${tg}`;
  const { fullName, email } = req.body;

  if (fullName !== undefined && typeof fullName !== "string") {
    res.status(400).json({ error: "Invalid display name" });
    return;
  }
  if (email !== undefined && typeof email !== "string") {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  const [existing] = await db
    .select({ telegramUsername: customersTable.telegramUsername })
    .from(customersTable)
    .where(eq(customersTable.telegramUsername, tgWithAt));

  const updates: Record<string, string | null> = {};
  if (fullName !== undefined) updates.fullName = fullName.trim() || null;
  if (email !== undefined) updates.email = email.trim() || null;

  if (existing) {
    await db.update(customersTable)
      .set(updates)
      .where(eq(customersTable.telegramUsername, tgWithAt));
  } else {
    await db.insert(customersTable).values({
      telegramUsername: tgWithAt,
      fullName: (updates.fullName as string | null | undefined) ?? null,
      email: (updates.email as string | null | undefined) ?? null,
    });
  }

  const [updated] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.telegramUsername, tgWithAt));

  writeLog("login", "info", "profile_updated",
    `Profile name/email updated for: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, profile: updated });
});

// POST /api/account/smart-login
// Unified login: tries password first, falls back to order-code login for old accounts.
// Returns { ok, telegramUsername, needsPassword, loginMethod }
router.post("/account/smart-login", async (req, res): Promise<void> => {
  const ip = req.ip ?? "unknown";
  const { telegramUsername, credential } = req.body;

  // ── IP Block check ──────────────────────────────────────────────────────────
  if (ip !== "unknown") {
    const now = new Date();
    const [ipBlock] = await db
      .select()
      .from(blockedIpsTable)
      .where(eq(blockedIpsTable.ip, ip));
    if (ipBlock && (!ipBlock.expiresAt || ipBlock.expiresAt > now)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!credential || typeof credential !== "string") {
    res.status(400).json({ error: "Password or order number is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg || tg.length < 2 || tg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  // ── IP Rate-limit check (via lookupAttemptsTable) ──────────────────────────
  const ipKey = `login_ip:${ip}`;
  const now2 = new Date();
  const [ipAttempt] = await db
    .select()
    .from(lookupAttemptsTable)
    .where(eq(lookupAttemptsTable.identifier, ipKey));
  if (ipAttempt?.blockedUntil && ipAttempt.blockedUntil > now2) {
    const minutesLeft = Math.ceil((ipAttempt.blockedUntil.getTime() - now2.getTime()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.` });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  // ── Path 1: Account has a password hash — try password first ──
  if (account?.passwordHash) {
    const passwordValid = await bcrypt.compare(credential, account.passwordHash);
    if (passwordValid) {
      if (account.accountStatus !== "active") {
        res.status(403).json({ error: "Account is not active" });
        return;
      }
      // Clear any IP failure counter on success
      if (ipAttempt) {
        db.update(lookupAttemptsTable)
          .set({ failedAttempts: 0, blockedUntil: null })
          .where(eq(lookupAttemptsTable.id, ipAttempt.id))
          .catch(() => {});
      }
      issueAccountCookie(res, tg);
      db.update(accountsTable).set({ lastLoginIp: ip, lastLoginAt: new Date() })
        .where(eq(accountsTable.telegramUsername, tg)).catch(() => {});
      writeLog("login", "info", "account_login",
        `Account login (password): ${tg}`,
        { telegramUsername: tg, loginMethod: "password" },
        ip,
      ).catch(() => {});
      res.json({ ok: true, telegramUsername: tg, needsPassword: false, loginMethod: "password" });
      return;
    }
    // Password didn't match — try as order code fallback
  }

  // ── Path 2: Try order-based login with credential as order code ──
  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(eq(ordersTable.code, credential.trim().toUpperCase()));

  const loginSucceeded = !!order && (() => {
    const tgBare = tg.replace(/^@/, "").toLowerCase();
    const orderTgBare = String(order.telegramUsername).replace(/^@/, "").toLowerCase();
    return orderTgBare === tgBare;
  })();

  if (!loginSucceeded) {
    // Pad timing
    await bcrypt.hash("notfound", 4);

    // Track failed attempt by IP
    const nowFail = new Date();
    const newCount = (ipAttempt?.failedAttempts ?? 0) + 1;
    const autoBlock = newCount >= LOGIN_MAX_FAILURES;
    const blockedUntil = autoBlock ? new Date(nowFail.getTime() + LOGIN_BLOCK_DURATION_MS) : null;

    if (ipAttempt) {
      await db.update(lookupAttemptsTable)
        .set({ failedAttempts: newCount, blockedUntil, lastAttemptAt: nowFail })
        .where(eq(lookupAttemptsTable.id, ipAttempt.id));
    } else {
      await db.insert(lookupAttemptsTable).values({
        id: randomUUID(),
        identifier: ipKey,
        failedAttempts: 1,
        lastAttemptAt: nowFail,
      });
    }

    if (autoBlock) {
      // Permanently add to blocked IPs (24h expiry) and notify admin
      const expiresAt = new Date(nowFail.getTime() + 24 * 60 * 60 * 1000);
      await db.insert(blockedIpsTable).values({
        id: randomUUID(),
        ip,
        reason: `Auto-blocked after ${newCount} failed login attempts (last target: @${tg})`,
        blockedBy: "system",
        expiresAt,
      }).onConflictDoNothing();

      const alertMsg = `🚨 *Brute-force detected*\n\nIP \`${ip}\` was auto-blocked after ${newCount} failed login attempts.\nLast target: @${tg}\n\nBlock expires in 24 hours. Manage in Admin → Security.`;
      sendAdminMessage(alertMsg).catch(() => {});
      createAlert("system", "high",
        "Brute-force login attempt blocked",
        `IP ${ip} auto-blocked after ${newCount} failed login attempts. Last target: @${tg}.`,
        { linkUrl: "/admin" },
      ).catch(() => {});

      writeLog("login", "warn", "login_ip_blocked",
        `IP auto-blocked after ${newCount} failed login attempts — last target: ${tg}`,
        { ip, telegramUsername: tg, failedAttempts: newCount },
        ip,
      ).catch(() => {});
    }

    writeLog("login", "warn", "account_login_failed",
      `Failed smart-login for: ${tg}`,
      { telegramUsername: tg, ip, failedAttempts: newCount },
      ip,
    ).catch(() => {});

    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  // ── Order login succeeded ───────────────────────────────────────────────────
  // Clear IP failure counter
  if (ipAttempt) {
    db.update(lookupAttemptsTable)
      .set({ failedAttempts: 0, blockedUntil: null })
      .where(eq(lookupAttemptsTable.id, ipAttempt.id))
      .catch(() => {});
  }

  // Create or update account entry if needed
  const [existing] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, passwordHash: accountsTable.passwordHash })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (!existing) {
    await db.insert(accountsTable).values({
      telegramUsername: tg,
      passwordHash: null,
      accountStatus: "active",
    });
  }

  const needsPassword = !existing?.passwordHash;
  issueAccountCookie(res, tg);

  db.update(accountsTable).set({ lastLoginIp: ip, lastLoginAt: new Date() })
    .where(eq(accountsTable.telegramUsername, tg)).catch(() => {});

  writeLog("login", "info", "account_order_login",
    `Smart-login (order) for ${tg} using order ${credential.trim().toUpperCase()}`,
    { telegramUsername: tg, orderCode: credential.trim().toUpperCase(), needsPassword, loginMethod: "order" },
    ip,
  ).catch(() => {});

  res.json({ ok: true, telegramUsername: tg, needsPassword, loginMethod: "order" });
});

// GET /api/account/profile — fetch customer profile for the logged-in account
router.get("/account/profile", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  // customers table stores with @ prefix
  const tgWithAt = tg.startsWith("@") ? tg : `@${tg}`;

  const [profile] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.telegramUsername, tgWithAt));

  res.json({ profile: profile ?? null });
});

// PUT /api/account/profile — update customer profile for the logged-in account
router.put("/account/profile", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const tgWithAt = tg.startsWith("@") ? tg : `@${tg}`;
  const { fullName, email, phone, address } = req.body;

  const [existing] = await db
    .select({ telegramUsername: customersTable.telegramUsername })
    .from(customersTable)
    .where(eq(customersTable.telegramUsername, tgWithAt));

  if (existing) {
    await db.update(customersTable).set({
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
    }).where(eq(customersTable.telegramUsername, tgWithAt));
  } else {
    await db.insert(customersTable).values({
      telegramUsername: tgWithAt,
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
    });
  }

  const [updated] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.telegramUsername, tgWithAt));

  writeLog("login", "info", "profile_updated",
    `Profile updated for: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: tgWithAt,
    eventCategory: "account",
    eventType: "account.profile_updated",
    actorType: "customer",
    metadata: {
      changedFields: Object.keys({ fullName, email, phone, address }).filter(k => req.body[k] !== undefined),
    },
  }).catch(() => {});

  notifyUserFromTemplate(tg, "profile", "customer_profile_linked",
    { username: tgWithAt.replace(/^@/, ""), app_url: process.env["APP_URL"] ?? "https://saltandpeps.co.uk" },
  ).catch(() => {});

  res.json({ profile: updated });
});

// GET /api/account/wholesale-draft — return the saved draft for the logged-in wholesale account
router.get("/account/wholesale-draft", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const [row] = await db
    .select({ wholesaleDraft: accountsTable.wholesaleDraft })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));
  res.json({ draft: row?.wholesaleDraft ?? null });
});

// PUT /api/account/wholesale-draft — save or clear the draft (pass null body to clear)
router.put("/account/wholesale-draft", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const draft = req.body?.draft ?? null;
  await db
    .update(accountsTable)
    .set({ wholesaleDraft: draft })
    .where(eq(accountsTable.telegramUsername, tg));
  res.json({ ok: true });
});

// GET /api/account/orders — orders for the logged-in account, optionally filtered by gbId
router.get("/account/orders", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { gbId } = req.query;

  // Orders are stored with @ prefix (via normalizeTg in orders.ts), account JWT stores without @
  // Match both @username and bare username for legacy data compatibility
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  // Build WHERE conditions — filter by gbId at the DB level when provided
  const whereConditions: any[] = [
    sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
    isNull(ordersTable.deletedAt),
  ];
  if (gbId && typeof gbId === "string") {
    whereConditions.push(sql`${ordersTable.groupBuyId} = ${gbId}`);
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(...whereConditions as [any]))
    .orderBy(desc(ordersTable.createdAt));

  if (rows.length === 0) { res.json([]); return; }

  // Batch-fetch line items in a single query (avoids N+1)
  const orderIds = rows.map(o => o.id);
  const allLineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const lineItemsByOrder = new Map<string, typeof allLineItems>();
  for (const li of allLineItems) {
    if (!lineItemsByOrder.has(li.orderId)) lineItemsByOrder.set(li.orderId, []);
    lineItemsByOrder.get(li.orderId)!.push(li);
  }

  // Batch-fetch currencies for unique group buy IDs
  const gbIds = [...new Set(rows.map(o => o.groupBuyId).filter(Boolean))] as string[];
  const gbCurrencyMap = new Map<string, string | null>();
  if (gbIds.length > 0) {
    const gbRows = await db
      .select({ id: groupBuysTable.id, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, gbIds));
    for (const row of gbRows) gbCurrencyMap.set(row.id, row.currency ?? null);
  }

  const results = rows.map(order => {
    const lineItems = lineItemsByOrder.get(order.id) ?? [];
    const currency = order.groupBuyId ? (gbCurrencyMap.get(order.groupBuyId) ?? null) : null;
    return {
      id: order.id,
      code: order.code,
      telegramUsername: order.telegramUsername,
      status: order.status,
      paymentStatus: order.paymentStatus ?? "unpaid",
      grandTotal: parseFloat(String(order.grandTotal)),
      amountDue: parseFloat(String((order as any).amountDue ?? "0")),
      productSubtotal: parseFloat(String(order.productSubtotal)),
      testingContribution: parseFloat(String(order.testingContribution ?? "0")),
      testVote: order.testVote ?? null,
      deliveryMethod: order.deliveryMethod,
      groupBuyId: order.groupBuyId ?? null,
      orderType: order.orderType ?? null,
      currency,
      adminMessage: order.adminMessage ?? null,
      trackingNumber: order.trackingNumber ?? null,
      notes: order.notes ?? null,
      directShippingRequested: order.directShippingRequested ?? false,
      createdAt: (order.createdAt as Date).toISOString(),
      lineItems: lineItems.map(li => ({
        productId: li.productId,
        productName: String(li.productName),
        quantity: parseFloat(String(li.quantity)),
        unitPrice: parseFloat(String(li.unitPrice)),
        lineTotal: parseFloat(String(li.lineTotal)),
        isOos: li.isOos ?? false,
      })),
    };
  });

  res.json(results);
});

// GET /api/account/orders/deleted — member's soft-deleted orders within the 48-hour restore window
// IMPORTANT: must be registered before GET /account/orders/:id to avoid "deleted" being captured as :id
router.get("/account/orders/deleted", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const WINDOW_MS = 48 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - WINDOW_MS);

  const rows = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
        isNotNull(ordersTable.deletedAt),
        gt(ordersTable.deletedAt, cutoff),
      )
    )
    .orderBy(desc(ordersTable.deletedAt));

  if (rows.length === 0) { res.json([]); return; }

  const orderIds = rows.map(o => o.id);
  const allLineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const lineItemsByOrder = new Map<string, typeof allLineItems>();
  for (const li of allLineItems) {
    if (!lineItemsByOrder.has(li.orderId)) lineItemsByOrder.set(li.orderId, []);
    lineItemsByOrder.get(li.orderId)!.push(li);
  }

  const gbIds = [...new Set(rows.map(o => o.groupBuyId).filter(Boolean))] as string[];
  const gbCurrencyMap = new Map<string, string | null>();
  if (gbIds.length > 0) {
    const gbRows = await db
      .select({ id: groupBuysTable.id, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, gbIds));
    for (const row of gbRows) gbCurrencyMap.set(row.id, row.currency ?? null);
  }

  const results = rows.map(order => {
    const lineItems = lineItemsByOrder.get(order.id) ?? [];
    const currency = order.groupBuyId ? (gbCurrencyMap.get(order.groupBuyId) ?? null) : null;
    const expiresAt = new Date(new Date(order.deletedAt!).getTime() + WINDOW_MS).toISOString();
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      grandTotal: parseFloat(String(order.grandTotal)),
      productSubtotal: parseFloat(String(order.productSubtotal)),
      deliveryMethod: order.deliveryMethod,
      groupBuyId: order.groupBuyId ?? null,
      currency,
      deletedAt: (order.deletedAt as Date).toISOString(),
      deletedBy: order.deletedBy ?? "customer",
      expiresAt,
      canRestore: order.deletedBy === "customer",
      lineItems: lineItems.map(li => ({
        productName: String(li.productName),
        quantity: parseFloat(String(li.quantity)),
        lineTotal: parseFloat(String(li.lineTotal)),
      })),
    };
  });

  res.json(results);
});

// GET /api/account/order-by-code — fetch a single order by code for the logged-in account
// Used by Lookup.tsx to auto-show the order when navigating from the portal with ?code=
router.get("/account/order-by-code", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const code = typeof req.query.code === "string" ? req.query.code.trim().toUpperCase() : null;

  if (!code) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.code, code),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  let obcCurrency: string | null = null;
  if (order.groupBuyId) {
    const [gbRow] = await db
      .select({ currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    obcCurrency = gbRow?.currency ?? null;
  }

  res.json({
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    deliveryMethod: order.deliveryMethod,
    deliveryMethodId: order.deliveryMethodId ?? null,
    deliveryPrice: parseFloat(String(order.deliveryPrice ?? "0")),
    vendorShipping: parseFloat(String(order.vendorShipping ?? "0")),
    productSubtotal: parseFloat(String(order.productSubtotal)),
    tip: parseFloat(String(order.tip ?? "0")),
    testingContribution: parseFloat(String(order.testingContribution ?? "0")),
    testVote: order.testVote ?? null,
    grandTotal: parseFloat(String(order.grandTotal)),
    adminFee: parseFloat(String((order as any).adminFee ?? "0")),
    adminFeeLabel: (order as any).adminFeeLabel ?? null,
    amountDue: parseFloat(String((order as any).amountDue ?? "0")),
    hasBalanceScreenshot: !!(order as any).balanceScreenshot,
    balanceTxHash: (order as any).balanceTxHash ?? null,
    balancePaymentStatus: (order as any).balancePaymentStatus ?? null,
    creditsApplied: order.creditsApplied ?? 0,
    notes: order.notes ?? null,
    status: order.status,
    adminMessage: order.adminMessage ?? null,
    trackingNumber: order.trackingNumber ?? null,
    paymentStatus: order.paymentStatus ?? "unpaid",
    paymentTxHash: order.paymentTxHash ?? null,
    paymentTestAmount: order.paymentTestAmount ? parseFloat(String(order.paymentTestAmount)) : null,
    testPaymentTxHash: order.testPaymentTxHash ?? null,
    paymentRejectionReason: order.paymentRejectionReason ?? null,
    shippingName: order.shippingName ?? null,
    shippingAddress: order.shippingAddress ?? null,
    shippingCountry: order.shippingCountry ?? null,
    shippingPhone: (order as any).shippingPhone ?? null,
    shippingEmail: (order as any).shippingEmail ?? null,
    orderType: order.orderType ?? null,
    pin: order.pin ?? "0000",
    inpostQrCode: order.inpostQrCode ?? null,
    royalMailQrCode: order.royalMailQrCode ?? null,
    groupBuyId: order.groupBuyId ?? null,
    currency: obcCurrency,
    createdAt: (order.createdAt as Date).toISOString(),
    updatedAt: (order.updatedAt as Date).toISOString(),
    lineItems: lineItems.map(li => ({
      id: li.id,
      productId: li.productId,
      productName: String(li.productName),
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      isOos: li.isOos ?? false,
    })),
  });
});

// GET /api/account/orders/:id — fetch a single order by UUID for the logged-in account
router.get("/account/orders/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        isNull(ordersTable.deletedAt),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  let groupBuyPaymentsEnabled: boolean | null = null;
  let groupBuyDirectShippingPaymentsEnabled: boolean | null = null;
  let groupBuyAllowOrderAddons = true;
  let customShippingRequiresAddress = false;
  let customShippingRequiresQrCode = false;
  let groupBuyQrUploadInpostEnabled = false;
  let groupBuyQrUploadRoyalMailEnabled = false;
  let groupBuyQrUploadMessage: string | null = null;
  let groupBuyQrUploadCouriers: string[] | null = null;
  let groupBuyCurrency: string | null = null;
  if (order.groupBuyId) {
    const [gb] = await db
      .select({
        paymentsEnabled: groupBuysTable.paymentsEnabled,
        directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled,
        qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
        qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
        qrUploadMessage: groupBuysTable.qrUploadMessage,
        qrUploadCouriers: groupBuysTable.qrUploadCouriers,
        currency: groupBuysTable.currency,
        allowOrderAddons: groupBuysTable.allowOrderAddons,
        shippingOptions: groupBuysTable.shippingOptions,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    groupBuyAllowOrderAddons = gb?.allowOrderAddons ?? true;
    groupBuyPaymentsEnabled = gb?.paymentsEnabled ?? true;
    groupBuyDirectShippingPaymentsEnabled = gb?.directShippingPaymentsEnabled ?? null;
    // Resolve per-option flags from the chosen custom shipping option
    if (gb?.shippingOptions && order.deliveryMethodId) {
      try {
        const opts = JSON.parse(gb.shippingOptions) as Array<{ id: string; requiresAddress?: boolean; requiresQrCode?: boolean }>;
        const matched = opts.find(o => o.id === order.deliveryMethodId);
        if (matched) {
          customShippingRequiresAddress = matched.requiresAddress ?? false;
          customShippingRequiresQrCode = matched.requiresQrCode ?? false;
        }
      } catch { /* ignore malformed JSON */ }
    }
    groupBuyQrUploadInpostEnabled = gb?.qrUploadInpostEnabled ?? false;
    groupBuyQrUploadRoyalMailEnabled = gb?.qrUploadRoyalMailEnabled ?? false;
    groupBuyQrUploadMessage = gb?.qrUploadMessage ?? null;
    groupBuyCurrency = gb?.currency ?? null;
    // Prefer the new couriers list; fall back to old boolean fields for backward compat
    if (gb?.qrUploadCouriers && (gb.qrUploadCouriers as string[]).length > 0) {
      groupBuyQrUploadCouriers = gb.qrUploadCouriers as string[];
    } else {
      const derived: string[] = [];
      if (gb?.qrUploadInpostEnabled) derived.push("InPost");
      if (gb?.qrUploadRoyalMailEnabled) derived.push("Royal Mail");
      groupBuyQrUploadCouriers = derived.length > 0 ? derived : null;
    }
  }

  // Look up the customer's country leg for this GB to check directShippingEnabled;
  // fall back to GB-level directShippingEnabled when the member has no country leg.
  let directShippingEnabled = false;
  if (order.groupBuyId) {
    const tgBare2 = tg.replace(/^@/, "").toLowerCase();
    const [agb] = await db
      .select({ countryLegId: accountGroupBuysTable.countryLegId })
      .from(accountGroupBuysTable)
      .where(
        and(
          eq(accountGroupBuysTable.groupBuyId, order.groupBuyId),
          sql`lower(${accountGroupBuysTable.accountId}) = ${tgBare2}`,
        )
      );
    if (agb?.countryLegId) {
      const [leg] = await db
        .select({ directShippingEnabled: gbCountryLegsTable.directShippingEnabled })
        .from(gbCountryLegsTable)
        .where(eq(gbCountryLegsTable.id, agb.countryLegId));
      directShippingEnabled = leg?.directShippingEnabled ?? false;
    }
    // Fallback: if no country leg (or leg has it off), check GB-level override
    if (!directShippingEnabled) {
      const [gbRow] = await db
        .select({ directShippingEnabled: groupBuysTable.directShippingEnabled })
        .from(groupBuysTable)
        .where(eq(groupBuysTable.id, order.groupBuyId));
      directShippingEnabled = gbRow?.directShippingEnabled ?? false;
    }
  }

  // Merge old inpost/royalMail QR codes into the generic qrCodes map
  const qrCodes: Record<string, string> = { ...((order.qrCodes as Record<string, string> | null) ?? {}) };
  if (order.inpostQrCode && !qrCodes["inpost"]) qrCodes["inpost"] = order.inpostQrCode;
  if (order.royalMailQrCode && !qrCodes["royal-mail"]) qrCodes["royal-mail"] = order.royalMailQrCode;

  res.json({
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    deliveryMethod: order.deliveryMethod,
    deliveryMethodId: order.deliveryMethodId ?? null,
    deliveryPrice: parseFloat(String(order.deliveryPrice ?? "0")),
    vendorShipping: parseFloat(String(order.vendorShipping ?? "0")),
    productSubtotal: parseFloat(String(order.productSubtotal)),
    tip: parseFloat(String(order.tip ?? "0")),
    testingContribution: parseFloat(String(order.testingContribution ?? "0")),
    testVote: order.testVote ?? null,
    grandTotal: parseFloat(String(order.grandTotal)),
    adminFee: parseFloat(String((order as any).adminFee ?? "0")),
    adminFeeLabel: (order as any).adminFeeLabel ?? null,
    amountDue: parseFloat(String((order as any).amountDue ?? "0")),
    hasBalanceScreenshot: !!(order as any).balanceScreenshot,
    balanceTxHash: (order as any).balanceTxHash ?? null,
    balancePaymentStatus: (order as any).balancePaymentStatus ?? null,
    creditsApplied: order.creditsApplied ?? 0,
    notes: order.notes ?? null,
    status: order.status,
    adminMessage: order.adminMessage ?? null,
    trackingNumber: order.trackingNumber ?? null,
    paymentStatus: order.paymentStatus ?? "unpaid",
    paymentTxHash: order.paymentTxHash ?? null,
    paymentTestAmount: order.paymentTestAmount ? parseFloat(String(order.paymentTestAmount)) : null,
    testPaymentTxHash: order.testPaymentTxHash ?? null,
    paymentRejectionReason: order.paymentRejectionReason ?? null,
    shippingName: order.shippingName ?? null,
    shippingAddress: order.shippingAddress ?? null,
    shippingCountry: order.shippingCountry ?? null,
    shippingPhone: (order as any).shippingPhone ?? null,
    shippingEmail: (order as any).shippingEmail ?? null,
    orderType: order.orderType ?? null,
    pin: order.pin ?? "0000",
    inpostQrCode: order.inpostQrCode ?? null,
    royalMailQrCode: order.royalMailQrCode ?? null,
    qrCodes,
    groupBuyId: order.groupBuyId ?? null,
    currency: groupBuyCurrency,
    groupBuyPaymentsEnabled,
    groupBuyDirectShippingPaymentsEnabled,
    groupBuyAllowOrderAddons,
    customShippingRequiresAddress,
    customShippingRequiresQrCode,
    groupBuyQrUploadInpostEnabled,
    groupBuyQrUploadRoyalMailEnabled,
    groupBuyQrUploadMessage,
    groupBuyQrUploadCouriers,
    directShippingEnabled,
    directShippingRequested: order.directShippingRequested ?? false,
    directShippingCost: order.directShippingCost != null ? parseFloat(String(order.directShippingCost)) : null,
    createdAt: (order.createdAt as Date).toISOString(),
    updatedAt: (order.updatedAt as Date).toISOString(),
    lineItems: lineItems.map(li => ({
      id: li.id,
      productId: li.productId,
      productName: String(li.productName),
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      isOos: li.isOos ?? false,
    })),
  });
});

// ── Wholesale shipping cost calculator (mirrors WholesaleOrder.tsx logic) ─────
interface WholesaleVendorRegion {
  name: string;
  prices?: number[];
  priceNote?: string;
  customNote?: string;
  countries?: string[];
}
interface WholesaleVendor {
  id: string;
  name: string;
  tiers: string[];
  tierBounds?: number[];
  maxKitsPerPackage?: number;
  regions: WholesaleVendorRegion[];
}

function calcDirectShippingCost(vendor: WholesaleVendor, countryName: string, totalKits: number): number | null {
  // Find region by country name (case-insensitive match on countries array or region name)
  const normalised = countryName.trim().toLowerCase();
  let region = vendor.regions.find(r =>
    (r.countries ?? []).some(c => c.toLowerCase() === normalised) ||
    r.name.toLowerCase() === normalised,
  );
  // Fallback: partial match on region name
  if (!region) {
    region = vendor.regions.find(r => normalised.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(normalised));
  }
  if (!region || !region.prices || region.customNote || region.priceNote) return null;

  const bounds: number[] = vendor.tierBounds ?? vendor.tiers.map((_, i) => (i + 1) * 5);
  const maxPkg: number = vendor.maxKitsPerPackage ?? 25;

  const getTierIndex = (kits: number): number => {
    for (let i = 0; i < bounds.length; i++) {
      if (kits <= bounds[i]) return i;
    }
    return bounds.length - 1;
  };

  let remaining = totalKits;
  let total = 0;
  while (remaining > 0) {
    const inThisPackage = Math.min(remaining, maxPkg);
    const tierIdx = getTierIndex(inThisPackage);
    const price = region.prices[tierIdx];
    if (price == null) return null;
    total += price;
    remaining -= inThisPackage;
  }
  return parseFloat(total.toFixed(2));
}

// PATCH /api/account/orders/:id/direct-shipping — toggle direct shipping on a submitted unpaid order
router.patch("/account/orders/:id/direct-shipping", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const { directShippingRequested } = req.body;

  if (typeof directShippingRequested !== "boolean") {
    res.status(400).json({ error: "directShippingRequested must be a boolean" });
    return;
  }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        isNull(ordersTable.deletedAt),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus !== "unpaid") {
    res.status(400).json({ error: "Cannot change shipping preference after payment has been made" });
    return;
  }

  if (!["Submitted", "Draft"].includes(order.status ?? "")) {
    res.status(400).json({ error: "Cannot change shipping preference at this order stage" });
    return;
  }

  // Verify the customer's country leg has direct shipping enabled and get leg details
  if (!order.groupBuyId) {
    res.status(400).json({ error: "Direct shipping preference is only available for group buy orders" });
    return;
  }

  const [agb] = await db
    .select({ countryLegId: accountGroupBuysTable.countryLegId })
    .from(accountGroupBuysTable)
    .where(
      and(
        eq(accountGroupBuysTable.groupBuyId, order.groupBuyId),
        sql`lower(${accountGroupBuysTable.accountId}) = ${tgBare}`,
      )
    );

  // Check leg-level directShippingEnabled first; fall back to GB-level override
  let legDirectShippingEnabled = false;
  let legWholesaleVendorId: string | null = null;
  let legCountryName: string | null = null;

  if (agb?.countryLegId) {
    const [leg] = await db
      .select({
        directShippingEnabled: gbCountryLegsTable.directShippingEnabled,
        wholesaleVendorId: gbCountryLegsTable.wholesaleVendorId,
        countryName: gbCountryLegsTable.countryName,
      })
      .from(gbCountryLegsTable)
      .where(eq(gbCountryLegsTable.id, agb.countryLegId));
    legDirectShippingEnabled = leg?.directShippingEnabled ?? false;
    legWholesaleVendorId = leg?.wholesaleVendorId ?? null;
    legCountryName = leg?.countryName ?? null;
  }

  // Fallback: GB-level directShippingEnabled (covers members without a country leg)
  if (!legDirectShippingEnabled) {
    const [gbRow] = await db
      .select({ directShippingEnabled: groupBuysTable.directShippingEnabled, directShippingVendorId: groupBuysTable.directShippingVendorId })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (!gbRow?.directShippingEnabled) {
      res.status(400).json({ error: "Direct shipping is not available for your country" });
      return;
    }
    // Use GB-level vendor for cost calc if no leg vendor
    if (!legWholesaleVendorId) legWholesaleVendorId = gbRow.directShippingVendorId ?? null;
  }

  // Calculate direct shipping cost from the wholesale vendor when toggling ON
  let directShippingCost: number | null = null;
  let newVendorShipping: number = parseFloat(String(order.vendorShipping ?? "0"));

  if (directShippingRequested && legWholesaleVendorId) {
    // Load the vendor config from site_config
    const [vendorConfigRow] = await db
      .select({ value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, "wholesale_vendors"));

    if (vendorConfigRow?.value) {
      try {
        const vendors: WholesaleVendor[] = JSON.parse(vendorConfigRow.value);
        const vendor = vendors.find(v => v.id === legWholesaleVendorId);
        if (vendor) {
          // Total kits from line items
          const lineItems = await db
            .select({ quantity: orderLineItemsTable.quantity })
            .from(orderLineItemsTable)
            .where(eq(orderLineItemsTable.orderId, id));
          const totalKits = lineItems.reduce((s, li) => s + parseFloat(String(li.quantity)), 0);
          directShippingCost = calcDirectShippingCost(vendor, legCountryName, totalKits);
        }
      } catch { /* ignore malformed config */ }
    }

    // Zero out the group buy vendor shipping (replaced by direct shipping cost)
    newVendorShipping = 0;
  }

  // Recalculate grandTotal
  const productSubtotal = parseFloat(String(order.productSubtotal ?? "0"));
  const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
  const tip = parseFloat(String(order.tip ?? "0"));
  const testingContribution = parseFloat(String(order.testingContribution ?? "0"));
  const couponDiscount = parseFloat(String(order.couponDiscount ?? "0"));

  let newGrandTotal: number;
  if (directShippingRequested) {
    newGrandTotal = productSubtotal + deliveryPrice + (directShippingCost ?? 0) + tip + testingContribution - couponDiscount;
  } else {
    // Restore original vendor shipping (0 for GB orders where it was TBD)
    newVendorShipping = 0;
    directShippingCost = null;
    newGrandTotal = productSubtotal + deliveryPrice + newVendorShipping + tip + testingContribution - couponDiscount;
  }
  newGrandTotal = parseFloat(Math.max(0, newGrandTotal).toFixed(2));

  await db
    .update(ordersTable)
    .set({
      directShippingRequested,
      directShippingCost: directShippingCost != null ? directShippingCost.toFixed(2) : null,
      vendorShipping: newVendorShipping.toFixed(2),
      grandTotal: newGrandTotal.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id));

  res.json({
    ok: true,
    directShippingRequested,
    directShippingCost,
    vendorShipping: newVendorShipping,
    grandTotal: newGrandTotal,
  });
});

// POST /api/account/orders/:id/test-vote — cast a lab test vote
router.post("/account/orders/:id/test-vote", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const { vote } = req.body;

  if (!vote || typeof vote !== "string" || vote.trim().length === 0) {
    res.status(400).json({ error: "Vote is required" });
    return;
  }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus !== "confirmed") {
    res.status(403).json({ error: "Voting is only available for confirmed orders" });
    return;
  }

  if (parseFloat(String(order.testingContribution ?? "0")) <= 0) {
    res.status(403).json({ error: "This order does not include a lab test contribution" });
    return;
  }

  if (order.testVote !== null) {
    res.status(409).json({ error: "You have already cast your vote" });
    return;
  }

  // Validate vote against order line items — client sends productId, we store product name
  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  const matchedLineItem = lineItems.find(li => String(li.productId) === vote.trim());
  if (!matchedLineItem) {
    res.status(400).json({ error: "Vote must be for a product in your order" });
    return;
  }

  const productName = String(matchedLineItem.productName);

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({ testVote: productName })
    .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.testVote)))
    .returning();

  if (!updatedOrder) {
    res.status(409).json({ error: "You have already cast your vote" });
    return;
  }

  logCustomerActivity({
    telegramUsername: tgWithAt,
    eventCategory: "group_buy",
    eventType: "group_buy.test_vote_submitted",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, votedProduct: productName, groupBuyId: order.groupBuyId },
  }).catch(() => {});

  res.json({
    success: true,
    testVote: productName,
    order: {
      id: updatedOrder.id,
      code: updatedOrder.code,
      testVote: updatedOrder.testVote,
      testingContribution: parseFloat(String(updatedOrder.testingContribution ?? "0")),
    },
  });
});

// POST /api/account/orders/:id/shipping-address — update shipping address (account cookie auth)
router.post("/account/orders/:id/shipping-address", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const { shippingName, shippingAddress, shippingCity, shippingPostcode, shippingCountry } = req.body;

  if (!shippingName?.trim() || !shippingAddress?.trim()) {
    res.status(400).json({ error: "Name and address are required" });
    return;
  }
  if (shippingName.trim().length > 200) {
    res.status(400).json({ error: "Name is too long" });
    return;
  }
  if (shippingAddress.trim().length > 1000) {
    res.status(400).json({ error: "Address is too long" });
    return;
  }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (await isCustomerActionLockedByGb(order.groupBuyId, "address")) {
    res.status(403).json({
      error: `This group buy is closed — shipping address can no longer be edited.`,
      lockedByGb: true,
    });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({
      shippingName: shippingName.trim().slice(0, 200),
      shippingAddress: shippingAddress.trim().slice(0, 1000),
      ...(shippingCity ? { shippingCity: String(shippingCity).trim().slice(0, 100) } : {}),
      ...(shippingPostcode ? { shippingPostcode: String(shippingPostcode).trim().slice(0, 20) } : {}),
      ...(shippingCountry ? { shippingCountry: String(shippingCountry).trim().slice(0, 128) } : {}),
    })
    .where(eq(ordersTable.id, id))
    .returning({ shippingName: ordersTable.shippingName, shippingAddress: ordersTable.shippingAddress });

  writeLog("order", "info", "shipping_address_updated",
    `Customer set shipping address on order ${order.code} (${order.telegramUsername}) via portal`,
    { orderId: id, code: order.code, telegramUsername: order.telegramUsername },
    req.ip ?? undefined,
  ).catch(() => {});

  res.json({ ok: true, shippingName: updated.shippingName, shippingAddress: updated.shippingAddress });
});

// POST /api/account/orders/:id/balance-screenshot — upload proof of payment for an outstanding balance
router.post("/account/orders/:id/balance-screenshot", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const { screenshot } = req.body;

  if (!screenshot || typeof screenshot !== "string") { res.status(400).json({ error: "screenshot is required" }); return; }
  if (!/^data:image\/(jpeg|jpg|png);base64,/.test(screenshot)) { res.status(400).json({ error: "screenshot must be a JPEG or PNG data URL" }); return; }
  const base64Part = screenshot.split(",")[1] ?? "";
  const byteLength = Math.ceil((base64Part.length * 3) / 4);
  if (byteLength > 15 * 1024 * 1024) { res.status(400).json({ error: "screenshot must be under 15 MB" }); return; }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select({ id: ordersTable.id, code: ordersTable.code, amountDue: ordersTable.amountDue })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (parseFloat(String(order.amountDue ?? "0")) <= 0) {
    res.status(400).json({ error: "No outstanding balance on this order" });
    return;
  }

  await db.update(ordersTable).set({ balanceScreenshot: screenshot }).where(eq(ordersTable.id, id));

  writeLog("change", "info", "balance_screenshot_uploaded",
    `Balance payment screenshot uploaded for order #${order.code}`,
    { orderId: id, telegramUsername: tg },
  ).catch(() => {});

  res.json({ ok: true });
});

// GET /api/account/orders/:id/balance-screenshot — fetch the customer's own uploaded balance proof
router.get("/account/orders/:id/balance-screenshot", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select({ balanceScreenshot: ordersTable.balanceScreenshot })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ balanceScreenshot: order.balanceScreenshot ?? null });
});

// GET /api/account/orders/:id/dispatch-images — list dispatch images for member's own order (metadata only)
router.get("/account/orders/:id/dispatch-images", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const imgs = await db.select({
    id: orderDispatchImagesTable.id,
    filename: orderDispatchImagesTable.filename,
    uploadedAt: orderDispatchImagesTable.uploadedAt,
  }).from(orderDispatchImagesTable).where(eq(orderDispatchImagesTable.orderId, id));

  res.json(imgs);
});

// GET /api/account/orders/:id/dispatch-images/:imageId — fetch dispatch image data for member's own order
router.get("/account/orders/:id/dispatch-images/:imageId", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const imageId = String(req.params["imageId"]);
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [img] = await db.select({
    imageData: orderDispatchImagesTable.imageData,
    filename: orderDispatchImagesTable.filename,
  }).from(orderDispatchImagesTable)
    .where(and(eq(orderDispatchImagesTable.id, imageId), eq(orderDispatchImagesTable.orderId, id)));

  if (!img) { res.status(404).json({ error: "Image not found" }); return; }
  res.json({ imageData: img.imageData, filename: img.filename });
});

// ─── Balance payment helpers ──────────────────────────────────
async function loadOwnedOrder(req: any, id: string) {
  const tg = req.account!.telegramUsername;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));
  return order ?? null;
}

// POST /api/account/orders/:id/balance-pay — submit a TX hash for an outstanding balance and auto-verify on-chain
router.post("/account/orders/:id/balance-pay", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { txHash } = req.body;
  const cleanHash = typeof txHash === "string" ? txHash.trim() : "";
  if (!cleanHash) {
    writeLog("payment", "warn", "balance_payment_rejected_invalid_hash", `Empty tx hash for balance payment on order ${id}`, { orderId: id, txHash: "", reason: "empty hash" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Transaction hash is required" }); return;
  }
  if (!isValidTxHash(cleanHash)) {
    writeLog("payment", "warn", "balance_payment_rejected_invalid_hash", `Invalid tx hash format for balance payment on order ${id}`, { orderId: id, txHash: cleanHash, reason: "invalid hash format" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Invalid transaction hash format. Expected a 64-character hex string (0x-prefixed for Ethereum/BSC, or plain hex for Bitcoin)." });
    return;
  }

  const order = await loadOwnedOrder(req, id);
  if (!order) {
    writeLog("payment", "warn", "balance_payment_rejected_not_found", `Order not found for balance payment: ${id}`, { orderId: id, txHash: cleanHash, reason: "order not found" }, req.ip).catch(() => {});
    res.status(404).json({ error: "Order not found" }); return;
  }

  const amountDueRaw = parseFloat(String((order as any).amountDue ?? "0"));
  if (amountDueRaw <= 0) {
    writeLog("payment", "warn", "balance_payment_rejected_no_balance", `No outstanding balance on order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, amountDue: amountDueRaw, reason: "no outstanding balance" }, req.ip).catch(() => {});
    res.status(400).json({ error: "No outstanding balance on this order" }); return;
  }
  if ((order as any).balancePaymentStatus === "confirmed") {
    writeLog("payment", "warn", "balance_payment_rejected_already_confirmed", `Balance payment attempt on already-confirmed order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, reason: "already confirmed" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Balance payment already confirmed" }); return;
  }

  // Anti-replay: reject hashes already used (or being verified) on any order, on any of the three TX columns.
  const reuse = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      sql`${ordersTable.id} <> ${id}`,
      or(
        eq(ordersTable.paymentTxHash, cleanHash),
        eq(ordersTable.testPaymentTxHash, cleanHash),
        eq((ordersTable as any).balanceTxHash, cleanHash),
      ),
    ));
  if (reuse.length > 0) {
    writeLog("payment", "warn", "balance_payment_rejected_replay", `Balance tx hash reuse attempt on order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, conflictOrderId: reuse[0]?.id, reason: "hash already used on another order" }, req.ip).catch(() => {});
    res.status(400).json({ error: "This transaction hash has already been used on another order. Each on-chain payment can only be applied once." });
    return;
  }

  const { walletAddress, currency, network } = await resolveOrderCrypto(order);
  if (!walletAddress) {
    writeLog("payment", "warn", "balance_payment_rejected_wallet", `Wallet not configured for balance payment on order ${order.code}`, { orderId: order.id, code: order.code, username: order.telegramUsername, currency, network, reason: "wallet not configured" }, req.ip).catch(() => {});
    res.status(400).json({ error: "Wallet address not configured" }); return;
  }

  const expectedAmount = parseFloat((await toUsdIfGbp(amountDueRaw, order.groupBuyId ?? null)).toFixed(2));
  const result = await verifyTransaction(cleanHash, walletAddress, expectedAmount, currency, network, 0.15);

  if (!result.verified) {
    if (result.manual) {
      await db.update(ordersTable)
        .set({ balanceTxHash: cleanHash, balancePaymentStatus: "pending_confirmation" } as any)
        .where(eq(ordersTable.id, id));
      writeLog("payment", "info", "balance_payment_manual", `Manual balance payment queued for order ${order.code} (${currency}/${network})`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, currency, network, expectedAmount, reason: result.reason }, req.ip).catch(() => {});
    } else {
      await db.update(ordersTable).set({ balanceTxHash: cleanHash } as any).where(eq(ordersTable.id, id));
      writeLog("payment", "warn", "balance_payment_failed", `Balance tx verification failed for order ${order.code}: ${result.reason}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, currency, network, expectedAmount, pending: result.pending ?? false, reason: result.reason }, req.ip).catch(() => {});
    }
    res.json({ verified: false, pending: result.pending ?? false, reason: result.reason });
    return;
  }

  await db.update(ordersTable)
    .set({ balanceTxHash: cleanHash, balancePaymentStatus: "confirmed", balanceConfirmedAt: new Date(), amountDue: "0.00" } as any)
    .where(eq(ordersTable.id, id));

  writeLog("payment", "info", "balance_payment_confirmed", `Balance payment confirmed for order ${order.code} — ${result.amountUsdt} ${currency}`, { orderId: order.id, code: order.code, username: order.telegramUsername, txHash: cleanHash, amountUsdt: result.amountUsdt, amountDue: amountDueRaw, currency, network, reason: "balance payment confirmed" }, req.ip).catch(() => {});
  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "payment",
    eventType: "payment.balance_confirmed",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, txHash: cleanHash, amountUsdt: result.amountUsdt, amountDue: amountDueRaw, currency, network, paymentType: "crypto" },
  }).catch(err => console.error("[balance-pay] activity log failed:", err));

  res.json({ verified: true, balancePaymentStatus: "confirmed", amountUsdt: result.amountUsdt });
});

// POST /api/account/orders/:id/balance-init-anonpay — initiate AnonPay session for an outstanding balance
router.post("/account/orders/:id/balance-init-anonpay", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const order = await loadOwnedOrder(req, id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const amountDueRaw = parseFloat(String((order as any).amountDue ?? "0"));
  if (amountDueRaw <= 0) { res.status(400).json({ error: "No outstanding balance on this order" }); return; }
  if ((order as any).balancePaymentStatus === "confirmed") {
    res.status(400).json({ error: "Balance payment already confirmed" }); return;
  }

  // Only reuse a stored AnonPay session while the customer is mid-payment (pending_confirmation).
  // Otherwise let them spin up a fresh session — stale/expired sessions should not be sticky.
  const existing = (order as any).balanceTxHash as string | null;
  const existingStatus = (order as any).balancePaymentStatus as string | null;
  if (existing?.startsWith(BALANCE_ANON_PAY_PREFIX) && existingStatus === "pending_confirmation") {
    const existingId = existing.slice(BALANCE_ANON_PAY_PREFIX.length);
    res.json({ iframeUrl: `https://trocador.app/en/anonpay/${encodeURIComponent(existingId)}?embed=1`, paymentId: existingId, existing: true });
    return;
  }

  // Resolve AnonPay config (GB overrides global)
  let anonPayEnabled = (await getSiteConfig("anonPayEnabled")) === "true";
  let anonPayWallet  = await getSiteConfig("anonPayWallet");
  let anonPayTicker  = await getSiteConfig("anonPayTicker");
  let anonPayNetwork = await getSiteConfig("anonPayNetwork");
  if (order.groupBuyId) {
    const [gb] = await db.select({ organiserPayments: groupBuysTable.organiserPayments }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
    const op: OrganiserPayments | null = gb?.organiserPayments as OrganiserPayments | null;
    if (op?.anonPayWallet)  anonPayWallet  = op.anonPayWallet;
    if (op?.anonPayTicker)  anonPayTicker  = op.anonPayTicker;
    if (op?.anonPayNetwork) anonPayNetwork = op.anonPayNetwork;
    if (typeof op?.anonPayEnabled === "boolean") anonPayEnabled = op.anonPayEnabled;
  }
  if (!anonPayEnabled) { res.status(403).json({ error: "AnonPay is not enabled for this order." }); return; }

  const PLACEHOLDER = new Set(["null", "undefined", "none", ""]);
  const isInvalid = (v: string | null) => !v || PLACEHOLDER.has(v.toLowerCase().trim());
  if (isInvalid(anonPayWallet) || isInvalid(anonPayTicker) || isInvalid(anonPayNetwork)) {
    res.status(400).json({ error: "AnonPay is not fully configured. Please contact the organiser." }); return;
  }

  const amountUsd = await toUsdIfGbp(amountDueRaw, order.groupBuyId ?? null);
  const amountWithFee = Math.round(amountUsd * 100) / 100;
  const description = encodeURIComponent(`${order.code ?? order.id}-bal`);
  const trocadorUrl = `https://trocador.app/anonpay/?ticker_to=${encodeURIComponent(anonPayTicker!)}&network_to=${encodeURIComponent(anonPayNetwork!)}&address=${encodeURIComponent(anonPayWallet!)}&amount=${amountWithFee.toFixed(2)}&description=${description}&direct=False&format=json`;

  let paymentId = "";
  try {
    const tr = await fetch(trocadorUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!tr.ok) {
      console.error("[balance-init-anonpay] Trocador error", tr.status, await tr.text().catch(() => ""));
      res.status(502).json({ error: "AnonPay service is unavailable. Please try another payment method." }); return;
    }
    const data = await tr.json() as Record<string, unknown>;
    paymentId = String(data["ID"] ?? data["id"] ?? data["payment_id"] ?? "").trim();
    if (!paymentId) {
      console.error("[balance-init-anonpay] no payment ID", data);
      res.status(502).json({ error: "AnonPay service did not return a payment ID. Please try again shortly." }); return;
    }
  } catch (err: any) {
    console.error("[balance-init-anonpay] fetch error", err?.message);
    res.status(502).json({ error: "Could not reach AnonPay service. Please try again shortly." }); return;
  }

  const storedId = `${BALANCE_ANON_PAY_PREFIX}${paymentId}`;
  await db.update(ordersTable).set({ balanceTxHash: storedId } as any).where(eq(ordersTable.id, id));
  res.json({ iframeUrl: `https://trocador.app/en/anonpay/${paymentId}?embed=1`, paymentId });
});

// POST /api/account/orders/:id/confirm-balance-anonpay — customer confirms they've initiated the AnonPay payment
router.post("/account/orders/:id/confirm-balance-anonpay", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const order = await loadOwnedOrder(req, id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if ((order as any).balancePaymentStatus === "confirmed") { res.json({ ok: true, balancePaymentStatus: "confirmed" }); return; }

  const tx = (order as any).balanceTxHash as string | null;
  if (!tx?.startsWith(BALANCE_ANON_PAY_PREFIX)) {
    res.status(400).json({ error: "No AnonPay session found. Please re-initialise." }); return;
  }
  await db.update(ordersTable).set({ balancePaymentStatus: "pending_confirmation" } as any).where(eq(ordersTable.id, id));

  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.balance_payment_submitted",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, paymentType: "anonpay", paymentId: tx.slice(BALANCE_ANON_PAY_PREFIX.length), amountDue: parseFloat(String((order as any).amountDue ?? "0")) },
  }).catch(err => console.error("[confirm-balance-anonpay] activity log failed:", err));

  res.json({ ok: true, balancePaymentStatus: "pending_confirmation" });
});

// GET /api/account/orders/:id/balance-anonpay-status — poll Trocador for AnonPay status (auto-confirms when finished)
router.get("/account/orders/:id/balance-anonpay-status", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const order = await loadOwnedOrder(req, id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if ((order as any).balancePaymentStatus === "confirmed") {
    res.json({ status: "confirmed", balancePaymentStatus: "confirmed" }); return;
  }
  if ((order as any).balancePaymentStatus !== "pending_confirmation") {
    res.status(400).json({ error: "Balance has not been submitted for AnonPay confirmation yet." }); return;
  }
  const tx = (order as any).balanceTxHash as string | null;
  if (!tx?.startsWith(BALANCE_ANON_PAY_PREFIX)) {
    res.status(409).json({ error: "This balance was not initiated via AnonPay." }); return;
  }
  const paymentId = tx.slice(BALANCE_ANON_PAY_PREFIX.length);

  let trocStatus = "";
  let trocOutgoingHash = "";
  try {
    const tr = await fetch(`https://trocador.app/anonpay/status/${encodeURIComponent(paymentId)}?format=json`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000),
    });
    if (tr.ok) {
      const data = await tr.json() as Record<string, unknown>;
      trocStatus = String(data["Status"] ?? data["status"] ?? data["payment_status"] ?? "").toLowerCase();
      trocOutgoingHash = String(data["Hash"] ?? data["hash"] ?? data["tx_hash"] ?? data["txhash"] ?? data["HashTo"] ?? data["hash_to"] ?? "").trim();
    }
  } catch (err: any) {
    console.warn("[balance-anonpay-status] fetch error", err?.message);
  }

  let balancePaymentStatus = (order as any).balancePaymentStatus as string;
  if (["anonpayfinished", "finished", "complete", "completed"].includes(trocStatus)) {
    if (balancePaymentStatus !== "confirmed") {
      const newBalanceTxHash = trocOutgoingHash
        ? `anonpay:${paymentId}|${trocOutgoingHash}`
        : `anonpay:${paymentId}`;
      await db.update(ordersTable).set({ balancePaymentStatus: "confirmed", balanceConfirmedAt: new Date(), amountDue: "0.00", balanceTxHash: newBalanceTxHash } as any).where(eq(ordersTable.id, id));
      balancePaymentStatus = "confirmed";
      await logCustomerActivity({
        telegramUsername: order.telegramUsername,
        eventCategory: "order",
        eventType: "order.balance_payment_confirmed",
        entityId: order.id,
        actorType: "system",
        metadata: { code: order.code, paymentType: "anonpay", paymentId, trocStatus, trocOutgoingHash: trocOutgoingHash || null },
      }).catch(err => console.error("[balance-anonpay-status] activity log failed:", err));
    }
  }
  res.json({ status: trocStatus, balancePaymentStatus });
});

// POST /api/account/orders/:id/balance-confirm-fiat — customer confirms a fiat (Revolut/PayPal) balance payment after uploading screenshot
router.post("/account/orders/:id/balance-confirm-fiat", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const method = String(req.body?.method ?? "").toLowerCase();
  if (!["revolut", "paypal"].includes(method)) { res.status(400).json({ error: "method must be revolut or paypal" }); return; }

  const order = await loadOwnedOrder(req, id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (parseFloat(String((order as any).amountDue ?? "0")) <= 0) { res.status(400).json({ error: "No outstanding balance on this order" }); return; }
  if (!(order as any).balanceScreenshot) { res.status(400).json({ error: "Please upload your payment screenshot first" }); return; }
  if ((order as any).balancePaymentStatus === "confirmed") { res.json({ ok: true, balancePaymentStatus: "confirmed" }); return; }

  await db.update(ordersTable).set({
    balanceTxHash: `fiat:${method}`,
    balancePaymentStatus: "pending_confirmation",
  } as any).where(eq(ordersTable.id, id));

  await logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.balance_payment_submitted",
    entityId: order.id,
    actorType: "customer",
    metadata: { code: order.code, paymentType: method, amountDue: parseFloat(String((order as any).amountDue ?? "0")) },
  }).catch(err => console.error("[balance-confirm-fiat] activity log failed:", err));

  res.json({ ok: true, balancePaymentStatus: "pending_confirmation" });
});

// POST /api/account/orders/:id/custom-qr — upload QR code for custom shipping option
router.post("/account/orders/:id/custom-qr", requireAccount, qrUploadMiddleware, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const existing: Record<string, string> = (order.qrCodes as Record<string, string> | null) ?? {};
  await db.update(ordersTable).set({ qrCodes: { ...existing, custom: qrCode } }).where(eq(ordersTable.id, id));
  res.json({ ok: true });
});

// POST /api/account/orders/:id/royal-mail-qr — upload Royal Mail QR code
router.post("/account/orders/:id/royal-mail-qr", requireAccount, qrUploadMiddleware, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  await db.update(ordersTable).set({ royalMailQrCode: qrCode }).where(eq(ordersTable.id, id));
  res.json({ ok: true });
});

// POST /api/account/orders/:id/inpost-qr — upload InPost QR code (account cookie auth)
router.post("/account/orders/:id/inpost-qr", requireAccount, qrUploadMiddleware, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  await db.update(ordersTable).set({ inpostQrCode: qrCode }).where(eq(ordersTable.id, id));
  res.json({ ok: true });
});

// POST /api/account/orders/:id/qr-upload — generic courier QR code upload
router.post("/account/orders/:id/qr-upload", requireAccount, qrUploadMiddleware, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const courierId = String(req.body?.courierId ?? "");
  if (!courierId || !/^[a-z0-9-]+$/.test(courierId)) {
    res.status(400).json({ error: "courierId must be a lowercase alphanumeric slug" }); return;
  }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;
  const [order] = await db
    .select({ id: ordersTable.id, qrCodes: ordersTable.qrCodes })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const existing: Record<string, string> = (order.qrCodes as Record<string, string> | null) ?? {};
  await db.update(ordersTable).set({ qrCodes: { ...existing, [courierId]: qrCode } }).where(eq(ordersTable.id, id));
  res.json({ ok: true });
});

// DELETE /api/account/orders/:id — delete an order (account cookie auth, Draft/Submitted only)
router.delete("/account/orders/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const deletableStatuses = ["Draft", "Submitted"];
  if (!deletableStatuses.includes(order.status)) {
    res.status(403).json({ error: `Orders with status "${order.status}" cannot be deleted. Contact support if needed.` });
    return;
  }

  if (await isCustomerActionLockedByGb(order.groupBuyId, "delete")) {
    res.status(403).json({
      error: `This group buy is closed — orders can no longer be deleted.`,
      lockedByGb: true,
    });
    return;
  }

  const deletedLineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, id));
  await db.update(ordersTable)
    .set({ deletedAt: new Date(), deletedBy: "customer" })
    .where(eq(ordersTable.id, id));

  writeLog("order", "warn", "order_deleted_by_customer",
    `Customer deleted order ${order.code} (${order.telegramUsername}, status: ${order.status}) via portal`,
    {
      orderId: id,
      code: order.code,
      telegramUsername: order.telegramUsername,
      status: order.status,
      snapshot: {
        deliveryMethod: order.deliveryMethod,
        grandTotal: order.grandTotal,
        lineItems: deletedLineItems.map(li => ({ productName: li.productName, quantity: li.quantity })),
      },
    },
    req.ip ?? undefined,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "order",
    eventType: "order.deleted",
    entityId: id,
    actorType: "customer",
    metadata: {
      snapshot: {
        id: order.id,
        code: order.code,
        status: order.status,
        grandTotal: order.grandTotal,
        deliveryMethod: order.deliveryMethod,
        lineItems: deletedLineItems.map(li => ({
          productName: li.productName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
        })),
      },
    },
  }).catch(() => {});

  res.json({ ok: true });
});

// POST /api/account/orders/:id/restore — member self-restores an accidentally deleted order
router.post("/account/orders/:id/restore", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, id),
        sql`lower(${ordersTable.telegramUsername}) IN (${tgWithAt}, ${tgBare})`,
        isNotNull(ordersTable.deletedAt),
      )
    );

  if (!order) {
    res.status(404).json({ error: "Deleted order not found" });
    return;
  }

  if (order.deletedBy !== "customer") {
    res.status(403).json({ error: "This order was removed by an admin and cannot be self-restored. Please contact support." });
    return;
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  if (order.deletedAt! < cutoff) {
    res.status(410).json({ error: "The 48-hour restore window for this order has expired." });
    return;
  }

  await db.update(ordersTable)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(ordersTable.id, id));

  writeLog("order", "info", "order_restored_by_customer",
    `Customer restored order ${order.code} (${order.telegramUsername}) via portal`,
    { orderId: id, code: order.code, telegramUsername: order.telegramUsername },
    req.ip ?? undefined,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "order",
    eventType: "order.restored",
    entityId: id,
    actorType: "customer",
    metadata: { code: order.code, status: order.status, grandTotal: order.grandTotal },
  }).catch(() => {});

  res.json({ ok: true, order: { id: order.id, code: order.code } });
});

// PATCH /api/account/health-consent — toggle health data consent
router.patch("/account/health-consent", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { consent } = req.body as { consent: boolean };
  if (typeof consent !== "boolean") {
    res.status(400).json({ error: "consent must be a boolean" });
    return;
  }
  await db
    .update(accountsTable)
    .set({ healthDataConsent: consent })
    .where(eq(accountsTable.telegramUsername, tg));
  res.json({ ok: true, healthDataConsent: consent });
});

// POST /api/account/forgot-password
// Takes telegramUsername, finds linked Telegram chat ID, sends a 6-digit OTP via DM.
// The OTP hash + expiry are stored on the account row.
router.post("/account/forgot-password", async (req, res): Promise<void> => {
  const { telegramUsername } = req.body;
  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg || tg.length < 2 || tg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  const [account] = await db
    .select({ telegramChatId: accountsTable.telegramChatId, passwordHash: accountsTable.passwordHash })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  // Always return the same response to prevent username enumeration
  const GENERIC_OK = { ok: true, message: "If this account has a linked Telegram, a reset code has been sent." };

  if (!account) {
    await new Promise(r => setTimeout(r, 400)); // constant-time delay
    res.json(GENERIC_OK);
    return;
  }

  if (!account.telegramChatId) {
    res.status(422).json({ error: "This account doesn't have a Telegram linked. Link Telegram in your profile first." });
    return;
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db
    .update(accountsTable)
    .set({ resetCode: codeHash, resetCodeExpiresAt: expiresAt })
    .where(eq(accountsTable.telegramUsername, tg));

  await sendTelegramMessage(
    account.telegramChatId,
    `🔐 <b>Password Reset</b>\n\nYour one-time reset code is:\n\n<code>${code}</code>\n\nThis code expires in <b>10 minutes</b>. If you didn't request this, you can safely ignore it.`,
    "HTML",
  );

  writeLog("login", "info", "password_reset_requested",
    `Password reset code sent for: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  res.json(GENERIC_OK);
});

// POST /api/account/reset-password
// Verifies the OTP code and sets a new password.
router.post("/account/reset-password", async (req, res): Promise<void> => {
  const { telegramUsername, code, newPassword } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Reset code is required" });
    return;
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
    res.status(400).json({ error: "Password must contain at least one number or special character" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  const [account] = await db
    .select({ resetCode: accountsTable.resetCode, resetCodeExpiresAt: accountsTable.resetCodeExpiresAt })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (!account?.resetCode || !account.resetCodeExpiresAt) {
    res.status(400).json({ error: "No reset code found. Please request a new one." });
    return;
  }

  if (account.resetCodeExpiresAt < new Date()) {
    res.status(400).json({ error: "Reset code has expired. Please request a new one." });
    return;
  }

  const codeHash = createHash("sha256").update(code.trim()).digest("hex");
  if (codeHash !== account.resetCode) {
    res.status(400).json({ error: "Invalid reset code." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db
    .update(accountsTable)
    .set({ passwordHash, resetCode: null, resetCodeExpiresAt: null })
    .where(eq(accountsTable.telegramUsername, tg));

  writeLog("login", "info", "password_reset_completed",
    `Password reset completed for: ${tg}`,
    { telegramUsername: tg },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, message: "Password updated successfully." });
});

// GET /api/account/contributions — pools the signed-in user has contributed to
router.get("/account/contributions", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  try {
    const contributions = await db
      .select({
        id: poolParticipantsTable.id,
        poolId: poolParticipantsTable.poolId,
        amountUsd: poolParticipantsTable.amountUsd,
        paymentStatus: poolParticipantsTable.paymentStatus,
        isPublic: poolParticipantsTable.isPublic,
        displayName: poolParticipantsTable.displayName,
        createdAt: poolParticipantsTable.createdAt,
        poolTitle: testingPoolsTable.title,
        poolSlug: testingPoolsTable.slug,
        poolStatus: testingPoolsTable.status,
      })
      .from(poolParticipantsTable)
      .innerJoin(testingPoolsTable, eq(poolParticipantsTable.poolId, testingPoolsTable.id))
      .where(eq(poolParticipantsTable.accountId, tg))
      .orderBy(desc(poolParticipantsTable.createdAt));

    res.json(contributions.map(c => ({
      id: c.id,
      poolId: c.poolId,
      amountUsd: parseFloat(String(c.amountUsd ?? "0")),
      paymentStatus: c.paymentStatus,
      isPublic: c.isPublic ?? false,
      displayName: c.displayName ?? null,
      createdAt: c.createdAt,
      pool: {
        title: c.poolTitle,
        slug: c.poolSlug,
        status: c.poolStatus,
      },
    })));
  } catch (err: any) {
    console.error("[account/contributions] error", err?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /api/account/group-buys/:gbId/parcels — customer parcel tracking ──────
// Returns only the parcels that contain items this customer personally ordered.
// Identical privacy filter to GET /api/group-buys/:id/parcels in gb-parcels.ts.
router.get("/account/group-buys/:gbId/parcels", requireAccount, async (req: any, res): Promise<void> => {
  const { gbId } = req.params;
  const tg = req.account?.telegramUsername as string | undefined;
  if (!tg) { res.status(401).json({ error: "Unauthorised" }); return; }

  const tgBare = tg.replace(/^@/, "").toLowerCase();
  const tgWithAt = `@${tgBare}`;

  // Verify membership in this group buy.
  // accountGroupBuysTable.accountId stores the telegram username (it references accountsTable.telegramUsername).
  const [membership] = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(
      and(
        eq(accountGroupBuysTable.groupBuyId, gbId),
        or(
          eq(sql`lower(${accountGroupBuysTable.accountId})`, tgWithAt),
          eq(sql`lower(${accountGroupBuysTable.accountId})`, tgBare),
        ),
      )
    );

  if (!membership) {
    res.status(403).json({ error: "Not a member of this group buy" });
    return;
  }

  // Only members with a confirmed order may see tracking
  const paidOrders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        inArray(ordersTable.paymentStatus, ["confirmed", "test_confirmed"]),
        or(
          eq(sql`lower(${ordersTable.telegramUsername})`, tgWithAt),
          eq(sql`lower(${ordersTable.telegramUsername})`, tgBare),
        ),
      )
    );

  if (paidOrders.length === 0) {
    res.status(403).json({ error: "No confirmed order in this group buy" });
    return;
  }

  const paidOrderIds = paidOrders.map(o => o.id);

  // Fetch routing info for each paid order to determine if the customer is direct-shipping
  const paidOrderRows = await db
    .select({
      id: ordersTable.id,
      routingType: ordersTable.routingType,
      directShippingRequested: ordersTable.directShippingRequested,
      reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.id, paidOrderIds));

  // Build set of reshippers explicitly stamped on the customer's orders
  const assignedReshippers = new Set(
    (paidOrderRows.map(o => o.reshipperUsername).filter(Boolean) as string[])
      .map(u => u.replace(/^@/, "").toLowerCase())
  );

  // Reshipper-routed orders (excludes direct-shipping orders)
  const reshipperOrderRows = paidOrderRows.filter(o => {
    if (o.routingType === "direct") return false;
    if (o.routingType === "reshipper") return true;
    return !o.directShippingRequested;
  });

  // Resolve reshippers via country leg for orders that don't have reshipperUsername stamped directly
  const legIds = reshipperOrderRows.map(o => o.countryLegId).filter(Boolean) as string[];
  if (legIds.length > 0) {
    const legRows = await db
      .select({ countryCode: gbCountryLegsTable.countryCode, gbId: gbCountryLegsTable.gbId })
      .from(gbCountryLegsTable)
      .where(inArray(gbCountryLegsTable.id, legIds));
    for (const leg of legRows) {
      const reshippers = await db
        .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
        .from(gbReshippersTable)
        .where(and(
          eq(gbReshippersTable.gbId, leg.gbId),
          eq(gbReshippersTable.country, leg.countryCode),
          eq(gbReshippersTable.enabled, true),
        ));
      reshippers.forEach(r => {
        if (r.reshipperUsername) assignedReshippers.add(r.reshipperUsername.replace(/^@/, "").toLowerCase());
      });
    }
  }

  // All reshipper names for this GB — used to identify "reshipper parcels" by their label
  const allGbReshipperRows = await db
    .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.gbId, gbId));
  const allGbReshipperNames = new Set(
    allGbReshipperRows.map(r => r.reshipperUsername.replace(/^@/, "").toLowerCase())
  );

  // Customer is "direct shipping" when none of their paid orders route through a reshipper hub
  const isDirect = reshipperOrderRows.length === 0;

  // Collect ordered product names and quantities from the customer's own orders
  const lineItems = await db
    .select({ productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity })
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, paidOrderIds));

  const orderedNames = new Set(lineItems.map(li => li.productName.trim().toLowerCase()));

  const memberQtyMap = new Map<string, number>();
  for (const li of lineItems) {
    const key = li.productName.trim().toLowerCase();
    memberQtyMap.set(key, (memberQtyMap.get(key) ?? 0) + (li.quantity ?? 1));
  }

  console.log(`[parcels-debug/acct] tg=${tg} gbId=${gbId} paidOrders=${paidOrders.length} isDirect=${isDirect} assignedReshippers=[${[...assignedReshippers].join(",")}] allReshippers=[${[...allGbReshipperNames].join(",")}]`);

  // Fetch all parcels for this group buy then filter to only those the customer can see
  const rows = await db
    .select()
    .from(gbParcelsTable)
    .where(eq(gbParcelsTable.groupBuyId, gbId))
    .orderBy(gbParcelsTable.createdAt);

  const relevant = rows.filter(p => {
    const items = ((p.items ?? []) as { name: string }[]);
    if (items.length === 0) return false;
    if (!items.some(item => orderedNames.has(item.name.trim().toLowerCase()))) return false;

    // Identify parcel's reshipper via explicit field or label matching
    const parcelReshipper = p.reshipperUsername
      ? p.reshipperUsername.replace(/^@/, "").toLowerCase()
      : (allGbReshipperNames.has(p.label.trim().toLowerCase()) ? p.label.trim().toLowerCase() : null);

    if (parcelReshipper !== null) {
      return assignedReshippers.has(parcelReshipper);
    }
    return isDirect;
  });

  // Mask the tracking number and strip items not belonging to this customer
  const masked = relevant.map(p => ({
    id: p.id,
    label: p.label,
    carrier: p.carrier,
    maskedTrackingNumber: "•".repeat(Math.min(Math.max((p.trackingNumber ?? "").length, 6), 12)),
    status: p.status,
    items: ((p.items ?? []) as { name: string; qty: number }[])
      .filter(item => orderedNames.has(item.name.trim().toLowerCase()))
      .map(item => ({
        ...item,
        qty: memberQtyMap.get(item.name.trim().toLowerCase()) ?? item.qty,
      })),
    events: p.cachedEvents ?? [],
    trackingUrl: p.trackingUrl ?? null,
    lastChecked: p.lastChecked,
    createdAt: p.createdAt,
  }));

  res.json(masked);
});

export default router;
