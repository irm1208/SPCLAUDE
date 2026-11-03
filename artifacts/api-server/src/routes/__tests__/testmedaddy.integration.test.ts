import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";

/**
 * Full Testmedaddy lifecycle against the real database, inside one transaction that is
 * rolled back at the end: nothing persists. Run with TMD_DB_TESTS=1.
 */
const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  const database: any = {};
  for (const method of ["select", "insert", "update", "delete", "execute"]) database[method] = (...args: any[]) => state.tx[method](...args);
  database.transaction = (callback: any) => callback(state.tx);
  return { ...real, db: database };
});

describe.skipIf(process.env.TMD_DB_TESTS !== "1")("testmedaddy / real PostgreSQL with rollback fixture", () => {
  let realDb: any, server: Server, base: string, origin: string;
  const mail: { to: string; subject: string }[] = [];
  const files = new Map<string, Buffer>();

  beforeAll(async () => {
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    (await import("../../lib/tmd-mail")).setTmdMailer(async m => { mail.push({ to: m.to, subject: m.subject }); return { ok: true }; });
    (await import("../../lib/tmd-files")).setTmdObjectStore({
      uploadFromBytes: async (key: string, bytes: Buffer) => { files.set(key, bytes); return { ok: true } as any; },
      downloadAsBytes: async (key: string) => files.has(key) ? ({ ok: true, value: [files.get(key)!] } as any) : ({ ok: false, error: new Error("missing") } as any),
      delete: async (key: string) => { files.delete(key); return { ok: true } as any; },
    });
    const app = express();
    app.use(cookieParser());
    app.use(express.json({ limit: "1mb" }));
    const api = express.Router();
    api.use((await import("../tmd-auth")).default);
    api.use((await import("../tmd-account")).default);
    api.use((await import("../tmd-vendors")).default);
    api.use((await import("../tmd-pools")).default);
    api.use((await import("../tmd-telegram")).default);
    app.use("/api", api);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    origin = base;
  });
  afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });

  type Session = { cookie: string; csrf: string };
  async function until(check: () => boolean, ms = 3000) {
    const deadline = Date.now() + ms;
    while (!check() && Date.now() < deadline) await new Promise(r => setTimeout(r, 25));
  }
  async function call(method: string, path: string, body?: unknown, session?: Session | null, headers: Record<string, string> = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(session ? { cookie: session.cookie, "x-tmd-csrf": session.csrf } : {}),
        ...(method !== "GET" ? { origin } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let data: any = text; try { data = JSON.parse(text); } catch { /* text */ }
    return { status: res.status, data, res };
  }
  async function signup(suffix: string, handle: string): Promise<Session & { user: any }> {
    const r = await call("POST", "/api/tmd/auth/signup", { email: `${handle}-${suffix}@example.invalid`, handle: `${handle}${suffix}`, displayName: handle, password: "correct horse battery" });
    expect(r.status, JSON.stringify(r.data)).toBe(201);
    const setCookie = r.res.headers.getSetCookie().find(c => c.startsWith("tmd_session="))!;
    expect(setCookie).toContain("Path=/api/tmd");
    expect(setCookie).toContain("HttpOnly");
    return { cookie: setCookie.split(";")[0], csrf: r.data.csrfToken, user: r.data.user };
  }
  async function fixture(run: () => Promise<void>) {
    const rollback = new Error("fixture rollback");
    await realDb.transaction(async (tx: any) => {
      state.tx = tx;
      await (await import("../../lib/tmd-schema")).ensureTestmedaddySchema(tx);
      await run();
      throw rollback;
    }).catch((error: unknown) => { if (error !== rollback) throw error; });
    state.tx = null;
  }

  it("runs a pool from signup to password-protected results", async () => {
    await fixture(async () => {
      const suffix = Math.random().toString(36).slice(2, 8);
      const organiser = await signup(suffix, "host");
      // The confirmation email is sent after the response, so give it a moment.
      await until(() => mail.some(m => m.subject.includes("Confirm")));
      expect(mail.some(m => m.subject.includes("Confirm"))).toBe(true);

      // Session and CSRF
      expect((await call("GET", "/api/tmd/me", undefined, organiser)).status).toBe(200);
      expect((await call("PATCH", "/api/tmd/me", { bio: "x" }, { cookie: organiser.cookie, csrf: "0".repeat(64) })).status).toBe(403);

      // Payout defaults
      const payout = await call("PUT", "/api/tmd/me/payout-methods", { paymentMethods: { crypto: [{ currency: "USDT", network: "ethereum", address: "0x1111111111111111111111111111111111111111" }], revolut: { handle: "@host" } } }, organiser);
      expect(payout.status).toBe(200);
      expect(payout.data.user.payoutMethods.crypto).toHaveLength(1);

      // Vendor and batch (community registry)
      const vendor = await call("POST", "/api/tmd/vendors", { name: `Fixture Labs ${suffix}`, website: "https://example.invalid" }, organiser);
      expect(vendor.status).toBe(201);
      const again = await call("POST", "/api/tmd/vendors", { name: `fixture labs ${suffix}` }, organiser);
      expect(again.data.existing).toBe(true);
      const batch = await call("POST", `/api/tmd/vendors/${vendor.data.vendor.id}/batches`, { compound: "BPC-157", batchNumber: `B-${suffix}`, mg: "10mg" }, organiser);
      expect(batch.status).toBe(201);

      // Draft pool inherits payout methods; target = 80 + 20 shipping = 100, even split over 2 → 50 each
      const created = await call("POST", "/api/tmd/pools", {
        title: `BPC-157 purity ${suffix}`, labName: "Janoshik", visibility: "public", resultsVisibility: "password", resultsPassword: "open sesame",
        splitMode: "even", minMembers: 2, shippingUsd: 20,
        items: [{ batchId: batch.data.batch.id, testType: "Purity (HPLC)", priceUsd: 80, quantity: 1 }],
      }, organiser);
      expect(created.status, JSON.stringify(created.data)).toBe(201);
      const pool = created.data.pool;
      expect(pool.status).toBe("draft");
      expect(Number(pool.targetUsd)).toBe(100);
      expect(pool.shareUsd).toBe(50);
      expect(pool.paymentMethods.crypto).toHaveLength(1);

      // Drafts are invisible to the public and absent from the listing
      expect((await call("GET", `/api/tmd/pools/${pool.slug}`)).status).toBe(404);
      expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "open" }, organiser)).status).toBe(200);
      const listing = await call("GET", "/api/tmd/pools?status=open");
      expect(listing.data.pools.some((p: any) => p.id === pool.id)).toBe(true);
      const vendorPage = await call("GET", `/api/tmd/vendors/${vendor.data.vendor.slug}`);
      expect(vendorPage.data.pools.some((p: any) => p.id === pool.id)).toBe(true);

      // Another organiser cannot manage it
      const stranger = await signup(suffix, "nosy");
      expect((await call("GET", `/api/tmd/pools/manage/${pool.id}`, undefined, stranger)).status).toBe(403);
      expect((await call("PATCH", `/api/tmd/pools/${pool.id}/members/x`, { paymentStatus: "verified" }, stranger)).status).toBe(403);

      // Guest joins with a claim token, pays by crypto with a tx hash
      const joined = await call("POST", `/api/tmd/pools/${pool.slug}/join`, { guestContact: "@guest_one", anonymous: true });
      expect(joined.status, JSON.stringify(joined.data)).toBe(201);
      const guest = joined.data.member;
      expect(guest.claimToken).toHaveLength(48);
      expect(Number(guest.amountUsd)).toBe(50);
      const publicView = await call("GET", `/api/tmd/pools/${pool.slug}`);
      expect(publicView.data.members[0].displayName).toBe("Anonymous");
      expect(publicView.data.members[0].claimToken).toBeUndefined();
      expect((await call("POST", `/api/tmd/members/${guest.id}/pay`, { method: "crypto", currency: "USDT", network: "ethereum", txHash: "0x" + "ab".repeat(32) })).status).toBe(404);
      const paid = await call("POST", `/api/tmd/members/${guest.id}/pay?claim=${guest.claimToken}`, { method: "crypto", currency: "USDT", network: "ethereum", txHash: "0x" + "ab".repeat(32) });
      expect(paid.status, JSON.stringify(paid.data)).toBe(200);
      expect(paid.data.member.paymentStatus).toBe("submitted");
      expect(paid.data.member.paymentAddress).toBe("0x1111111111111111111111111111111111111111");

      // A signed-in member joins and pays by Revolut reference
      const member = await signup(suffix, "member");
      const joined2 = await call("POST", `/api/tmd/pools/${pool.slug}/join`, { displayName: "Sam" }, member);
      expect(joined2.status).toBe(201);
      const second = joined2.data.member;
      expect((await call("POST", `/api/tmd/members/${second.id}/pay`, { method: "revolut", reference: "SAM-1" }, member)).data.member.paymentStatus).toBe("submitted");
      expect((await call("POST", `/api/tmd/members/${second.id}/pay`, { method: "paypal", reference: "x" }, member)).status).toBe(400);

      // Organiser sees everything, confirms both, pool becomes funded automatically
      const manage = await call("GET", `/api/tmd/pools/manage/${pool.id}`, undefined, organiser);
      expect(manage.data.members).toHaveLength(2);
      expect(manage.data.members[0].displayName).toBe("guest_one");
      expect((await call("PATCH", `/api/tmd/pools/${pool.id}/members/${guest.id}`, { paymentStatus: "verified" }, organiser)).data.member.paymentStatus).toBe("verified");
      const afterSecond = await call("PATCH", `/api/tmd/pools/${pool.id}/members/${second.id}`, { paymentStatus: "verified" }, organiser);
      expect(afterSecond.status).toBe(200);
      const funded = await call("GET", `/api/tmd/pools/${pool.slug}`);
      expect(funded.data.pool.status).toBe("funded");
      expect(funded.data.pool.progress.pct).toBe(100);
      expect(funded.data.announcements.some((m: any) => m.kind === "system" && /funded/.test(m.body))).toBe(true);

      // Tests are locked once money moved
      expect((await call("PATCH", `/api/tmd/pools/${pool.id}`, { items: [] }, organiser)).status).toBe(409);
      // Members cannot be deleted while verified, pool cannot be deleted
      expect((await call("DELETE", `/api/tmd/pools/${pool.id}/members/${guest.id}`, undefined, organiser)).status).toBe(409);
      expect((await call("DELETE", `/api/tmd/pools/${pool.id}`, undefined, organiser)).status).toBe(409);

      // Chat: visible to members, hidden from outsiders
      expect((await call("POST", `/api/tmd/pools/${pool.slug}/messages`, { body: "hello" }, stranger)).status).toBe(403);
      expect((await call("POST", `/api/tmd/pools/${pool.slug}/messages?claim=${guest.claimToken}`, { body: "when do we ship?" })).status).toBe(201);
      expect((await call("POST", `/api/tmd/pools/${pool.slug}/messages`, { body: "Shipping Monday", kind: "broadcast" }, organiser)).status).toBe(201);
      const outsider = await call("GET", `/api/tmd/pools/${pool.slug}/messages`);
      expect(outsider.data.messages.some((m: any) => m.kind === "chat")).toBe(false);
      expect(outsider.data.messages.some((m: any) => m.kind === "broadcast")).toBe(true);
      const insider = await call("GET", `/api/tmd/pools/${pool.slug}/messages`, undefined, member);
      expect(insider.data.messages.some((m: any) => m.body === "when do we ship?")).toBe(true);
      const inbox = await call("GET", "/api/tmd/me/notifications", undefined, member);
      expect(inbox.data.notifications.some((n: any) => n.kind === "broadcast")).toBe(true);
      expect(inbox.data.notifications.some((n: any) => n.kind === "payment_verified")).toBe(true);

      // To the lab, results saved, then published behind the password
      expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "results" }, organiser)).status).toBe(409);
      expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "at_lab" }, organiser)).status).toBe(200);
      expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "results" }, organiser)).status).toBe(400);
      const itemId = pool.items[0].id;
      const saved = await call("PUT", `/api/tmd/pools/${pool.id}/results`, { notes: "Looks clean.", results: [{ poolItemId: itemId, purityPct: 99.42, passed: true, summary: "99.4% by HPLC" }] }, organiser);
      expect(saved.status, JSON.stringify(saved.data)).toBe(200);
      expect(saved.data.results.items).toHaveLength(1);
      // Not published yet: nobody outside sees them
      expect((await call("GET", `/api/tmd/pools/${pool.slug}`)).data.results).toBeNull();
      expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "results" }, organiser)).status).toBe(200);

      const locked = await call("GET", `/api/tmd/pools/${pool.slug}`);
      expect(locked.data.resultsLocked).toBe(true);
      expect(locked.data.results).toBeNull();
      expect((await call("POST", `/api/tmd/pools/${pool.slug}/results/unlock`, { password: "wrong" })).status).toBe(401);
      const unlocked = await call("POST", `/api/tmd/pools/${pool.slug}/results/unlock`, { password: "open sesame" });
      expect(unlocked.status).toBe(200);
      expect(unlocked.data.results.items[0].purityPct).toBe("99.420");
      // Verified members see results without the password
      const asGuest = await call("GET", `/api/tmd/pools/${pool.slug}?claim=${guest.claimToken}`);
      expect(asGuest.data.results?.notes).toBe("Looks clean.");
      const asMember = await call("GET", `/api/tmd/pools/${pool.slug}`, undefined, member);
      expect(asMember.data.results?.items).toHaveLength(1);
      // Password-protected results stay off the vendor page
      const vendorAfter = await call("GET", `/api/tmd/vendors/${vendor.data.vendor.slug}`);
      expect(vendorAfter.data.results).toHaveLength(0);
      // Members are told in-app; email only goes to confirmed addresses, and these fixtures never confirmed.
      const memberInbox = await call("GET", "/api/tmd/me/notifications", undefined, member);
      expect(memberInbox.data.notifications.some((n: any) => n.kind === "pool_results")).toBe(true);
      expect(mail.some(m => m.subject.includes("Results are in"))).toBe(false);

      // Logout kills the session
      expect((await call("POST", "/api/tmd/auth/logout", undefined, organiser)).status).toBe(200);
      expect((await call("GET", "/api/tmd/me", undefined, organiser)).status).toBe(401);
    });
  }, 120_000);

  it("gates invite-only pools behind the access code and keeps unlisted pools out of listings", async () => {
    await fixture(async () => {
      const suffix = Math.random().toString(36).slice(2, 8);
      const organiser = await signup(suffix, "inv");
      await call("PUT", "/api/tmd/me/payout-methods", { paymentMethods: { paypal: { email: "pay@example.invalid" } } }, organiser);
      const invite = await call("POST", "/api/tmd/pools", { title: `Invite pool ${suffix}`, visibility: "invite", accessCode: "secret-code", splitMode: "fixed", fixedShareUsd: 25, items: [{ testType: "Sterility", priceUsd: 50 }] }, organiser);
      expect(invite.status).toBe(201);
      const unlisted = await call("POST", "/api/tmd/pools", { title: `Unlisted pool ${suffix}`, visibility: "unlisted", splitMode: "fixed", fixedShareUsd: 25, items: [{ testType: "Sterility", priceUsd: 50 }] }, organiser);
      for (const p of [invite, unlisted]) expect((await call("POST", `/api/tmd/pools/${p.data.pool.id}/status`, { status: "open" }, organiser)).status).toBe(200);

      const slug = invite.data.pool.slug;
      expect((await call("GET", `/api/tmd/pools/${slug}`)).status).toBe(401);
      expect((await call("GET", `/api/tmd/pools/${slug}`, undefined, null, { "x-tmd-access-code": "nope" })).status).toBe(401);
      const ok = await call("GET", `/api/tmd/pools/${slug}`, undefined, null, { "x-tmd-access-code": "secret-code" });
      expect(ok.status).toBe(200);
      expect(ok.data.pool.inviteOnly).toBe(true);
      expect((await call("POST", `/api/tmd/pools/${slug}/join`, { guestContact: "g@example.invalid" })).status).toBe(401);
      const joined = await call("POST", `/api/tmd/pools/${slug}/join?code=secret-code`, { guestContact: "g@example.invalid" });
      expect(joined.status).toBe(201);
      // Once a member, the claim token is enough
      expect((await call("GET", `/api/tmd/pools/${slug}?claim=${joined.data.member.claimToken}`)).status).toBe(200);

      const listing = await call("GET", "/api/tmd/pools?status=all");
      const ids = listing.data.pools.map((p: any) => p.id);
      expect(ids).not.toContain(invite.data.pool.id);
      expect(ids).not.toContain(unlisted.data.pool.id);
      expect((await call("GET", `/api/tmd/pools/${unlisted.data.pool.slug}`)).status).toBe(200);

      // Opening needs a payment method and a results password when protected
      const bare = await call("POST", "/api/tmd/pools", { title: `Bare pool ${suffix}`, paymentMethods: {}, resultsVisibility: "password", items: [{ testType: "Sterility", priceUsd: 50 }] }, organiser);
      const openBare = await call("POST", `/api/tmd/pools/${bare.data.pool.id}/status`, { status: "open" }, organiser);
      expect(openBare.status).toBe(400);
    });
  }, 120_000);

  it("handles password reset and email verification tokens", async () => {
    await fixture(async () => {
      const suffix = Math.random().toString(36).slice(2, 8);
      const session = await signup(suffix, "reset");
      const { issueEmailToken, consumeEmailToken } = await import("../../lib/tmd-mail");
      const verifyToken = await issueEmailToken(session.user.id, "verify");
      expect((await call("POST", "/api/tmd/auth/verify-email", { token: verifyToken })).status).toBe(200);
      expect((await call("POST", "/api/tmd/auth/verify-email", { token: verifyToken })).status).toBe(410);
      expect((await call("GET", "/api/tmd/me", undefined, session)).data.user.emailVerified).toBe(true);

      expect((await call("POST", "/api/tmd/auth/forgot-password", { email: "nobody@example.invalid" })).status).toBe(200);
      const resetToken = await issueEmailToken(session.user.id, "reset");
      expect((await call("POST", "/api/tmd/auth/reset-password", { token: resetToken, password: "short" })).status).toBe(400);
      expect((await call("POST", "/api/tmd/auth/reset-password", { token: resetToken, password: "a brand new passphrase" })).status).toBe(200);
      // Old session revoked, new password works, old one does not
      expect((await call("GET", "/api/tmd/me", undefined, session)).status).toBe(401);
      expect((await call("POST", "/api/tmd/auth/login", { email: session.user.email, password: "correct horse battery" })).status).toBe(401);
      expect((await call("POST", "/api/tmd/auth/login", { email: session.user.handle, password: "a brand new passphrase" })).status).toBe(200);
      expect(await consumeEmailToken(resetToken, "reset")).toBeNull();
    });
  }, 120_000);
  it("links Telegram for accounts and pool groups and bridges the chat both ways", async () => {
    const { setTmdTelegramTransport, tmdWebhookSecret } = await import("../../lib/tmd-telegram");
    const tg: { method: string; payload: any }[] = [];
    const sentTo = (chatId: string, needle: string) => tg.some(c => c.method === "sendMessage" && String(c.payload.chat_id) === chatId && String(c.payload.text).includes(needle));
    setTmdTelegramTransport(async (method, payload) => { tg.push({ method, payload }); return { ok: true, result: method === "getMe" ? { username: "testmedaddy_bot" } : { message_id: tg.length } }; });
    const previousEnv = { token: process.env.TMD_TELEGRAM_BOT_TOKEN };
    process.env.TMD_TELEGRAM_BOT_TOKEN = "123:integration";
    const tgHeaders = { "x-telegram-bot-api-secret-token": tmdWebhookSecret("123:integration") };
    const webhook = (update: unknown, headers: Record<string, string> = tgHeaders) => call("POST", "/api/tmd/telegram/webhook", update, null, headers);
    try {
      await fixture(async () => {
        const suffix = Math.random().toString(36).slice(2, 8);
        const organiser = await signup(suffix, "host");
        const member = await signup(suffix, "payer");

        /* ---- Telegram: account link ---- */
        expect((await webhook({ message: { chat: { id: 1, type: "private" }, text: "/start" } }, {})).status).toBe(401);
        const userLink = await call("POST", "/api/tmd/me/telegram/link", {}, organiser);
        expect(userLink.status, JSON.stringify(userLink.data)).toBe(200);
        expect(userLink.data.url).toBe(`https://t.me/testmedaddy_bot?start=${userLink.data.token}`);
        expect((await webhook({ message: { message_id: 1, chat: { id: 5001, type: "private", username: "hostie" }, from: { id: 5001, username: "hostie" }, text: userLink.data.command } })).status).toBe(200);
        await until(() => sentTo("5001", "Connected"));
        const me = await call("GET", "/api/tmd/me", undefined, organiser);
        expect(me.data.user.telegramLinked).toBe(true);
        expect(me.data.user.telegramUsername).toBe("hostie");
        // A used or garbage code fails politely
        await webhook({ message: { message_id: 2, chat: { id: 5002, type: "private" }, from: { id: 5002 }, text: userLink.data.command } });
        await until(() => sentTo("5002", "expired"));
        expect(sentTo("5002", "expired")).toBe(true);

        /* ---- Payout methods: SOL is a valid rail alongside the stablecoins ---- */
        const payout = await call("PUT", "/api/tmd/me/payout-methods", { paymentMethods: { crypto: [{ currency: "USDT", network: "ethereum", address: "0x1111111111111111111111111111111111111111" }, { currency: "SOL", network: "solana", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" }] } }, organiser);
        expect(payout.data.user.payoutMethods.crypto).toHaveLength(2);

        /* ---- Pool with a linked Telegram group ---- */
        const created = await call("POST", "/api/tmd/pools", { title: `Card pool ${suffix}`, splitMode: "even", minMembers: 2, items: [{ testType: "Purity (HPLC)", priceUsd: 100 }] }, organiser);
        expect(created.status, JSON.stringify(created.data)).toBe(201);
        const pool = created.data.pool;
        expect(pool.paymentMethods.crypto.map((r: any) => r.currency)).toEqual(["USDT", "SOL"]);
        expect((await call("POST", `/api/tmd/pools/${pool.id}/status`, { status: "open" }, organiser)).status).toBe(200);
        const poolLink = await call("POST", `/api/tmd/pools/${pool.id}/telegram/link`, {}, organiser);
        expect(poolLink.status).toBe(200);
        // A pool code sent in a private chat is refused with guidance
        await webhook({ message: { message_id: 3, chat: { id: 5001, type: "private" }, from: { id: 5001 }, text: `/start ${poolLink.data.token}` } });
        await until(() => sentTo("5001", "pool code"));
        const freshPoolLink = await call("POST", `/api/tmd/pools/${pool.id}/telegram/link`, {}, organiser);
        await webhook({ message: { message_id: 4, chat: { id: -100123, type: "supergroup", title: "BPC crew" }, from: { id: 5001 }, text: freshPoolLink.data.command.replace("/link", "/link@testmedaddy_bot") } });
        await until(() => sentTo("-100123", "now connected"));
        const publicView = await call("GET", `/api/tmd/pools/${pool.slug}`);
        expect(publicView.data.pool.telegram).toEqual({ linked: true, title: "BPC crew" });
        expect((await call("GET", `/api/tmd/pools/${pool.id}/telegram`, undefined, organiser)).data).toMatchObject({ linked: true, title: "BPC crew", botUsername: "testmedaddy_bot" });

        // Web → group: chat and announcements are mirrored; organiser also gets a Telegram DM about the join
        const joined = await call("POST", `/api/tmd/pools/${pool.slug}/join`, { displayName: "Payer" }, member);
        expect(joined.status).toBe(201);
        await until(() => sentTo("5001", "joined"));
        expect(sentTo("5001", "joined")).toBe(true);
        expect((await call("POST", `/api/tmd/pools/${pool.slug}/messages`, { body: "hello from web" }, member)).status).toBe(201);
        await until(() => sentTo("-100123", "hello from web"));
        expect(sentTo("-100123", "hello from web")).toBe(true);
        expect((await call("POST", `/api/tmd/pools/${pool.slug}/messages`, { body: "Vials shipped", kind: "broadcast" }, organiser)).status).toBe(201);
        await until(() => sentTo("-100123", "Vials shipped"));
        expect(tg.find(c => String(c.payload.text).includes("Vials shipped"))?.payload.text).toMatch(/^📣/);

        // Group → web: a message in the group lands in the pool chat once, attributed to the linked account, and is not echoed back
        const before = tg.filter(c => String(c.payload.chat_id) === "-100123").length;
        const groupMessage = { message: { message_id: 10, chat: { id: -100123, type: "supergroup", title: "BPC crew" }, from: { id: 5001, username: "hostie" }, text: "hello from telegram" } };
        expect((await webhook(groupMessage)).status).toBe(200);
        await until(() => false, 150);
        await webhook(groupMessage);
        await until(() => false, 150);
        const chat = await call("GET", `/api/tmd/pools/${pool.slug}/messages`, undefined, member);
        const mirrored = chat.data.messages.filter((m: any) => m.body === "hello from telegram");
        expect(mirrored).toHaveLength(1);
        expect(mirrored[0].authorName).toBe("host (organiser)");
        expect(tg.filter(c => String(c.payload.chat_id) === "-100123").length).toBe(before);
        // An unknown Telegram user is named from their profile and notifies the organiser
        await webhook({ message: { message_id: 11, chat: { id: -100123, type: "supergroup" }, from: { id: 777, first_name: "Random" }, text: "is this legit?" } });
        await until(() => sentTo("5001", "is this legit?"));
        const chat2 = await call("GET", `/api/tmd/pools/${pool.slug}/messages`, undefined, member);
        expect(chat2.data.messages.find((m: any) => m.body === "is this legit?")?.authorName).toBe("Random (Telegram)");
        // /status in the group reports funding
        await webhook({ message: { message_id: 12, chat: { id: -100123, type: "supergroup" }, from: { id: 777 }, text: "/status" } });
        await until(() => sentTo("-100123", "0%"));
        expect(sentTo("-100123", `Card pool ${suffix}`)).toBe(true);

        /* ---- Payment, funding announcement, quotes ---- */
        const memberRow = joined.data.member;
        // Quotes: stablecoins are 1:1; unknown coins are refused; invite rules still apply
        const stableQuote = await call("GET", `/api/tmd/pools/${pool.slug}/quote?currency=USDT`, undefined, member);
        expect(stableQuote.data).toMatchObject({ currency: "USDT", cryptoAmount: 50, usdPerCoin: 1, stable: true });
        expect((await call("GET", `/api/tmd/pools/${pool.slug}/quote?currency=BTC`, undefined, member)).status).toBe(400);
        const paidUsdt = await call("POST", `/api/tmd/members/${memberRow.id}/pay`, { method: "crypto", currency: "USDT", network: "ethereum", txHash: "0x" + "ab".repeat(32) }, member);
        expect(paidUsdt.status).toBe(200);
        expect(paidUsdt.data.member.paymentAmountCrypto).toBeNull();
        expect((await call("PATCH", `/api/tmd/pools/${pool.id}/members/${memberRow.id}`, { paymentStatus: "verified" }, organiser)).status).toBe(200);
        const guest = await call("POST", `/api/tmd/pools/${pool.slug}/join`, { guestContact: "guest@example.invalid" });
        const claim = `?claim=${guest.data.member.claimToken}`;
        await call("POST", `/api/tmd/members/${guest.data.member.id}/pay${claim}`, { method: "crypto", currency: "USDT", network: "ethereum", txHash: "0x" + "cd".repeat(32) });
        await call("PATCH", `/api/tmd/pools/${pool.id}/members/${guest.data.member.id}`, { paymentStatus: "verified" }, organiser);
        expect((await call("GET", `/api/tmd/pools/manage/${pool.id}`, undefined, organiser)).data.pool.status).toBe("funded");
        await until(() => sentTo("-100123", "fully funded"));
        expect(sentTo("-100123", "fully funded")).toBe(true);
        await until(() => sentTo("-100123", "sent to the lab") || true, 50);

        /* ---- Unlinking ---- */
        expect((await call("DELETE", "/api/tmd/me/telegram", undefined, organiser)).data.user.telegramLinked).toBe(false);
        await webhook({ my_chat_member: { chat: { id: -100123 }, new_chat_member: { status: "kicked" } } });
        await until(() => false, 150);
        expect((await call("GET", `/api/tmd/pools/${pool.slug}`)).data.pool.telegram.linked).toBe(false);
      });
    } finally {
      setTmdTelegramTransport(null);
      if (previousEnv.token === undefined) delete process.env.TMD_TELEGRAM_BOT_TOKEN; else process.env.TMD_TELEGRAM_BOT_TOKEN = previousEnv.token;
    }
  }, 180_000);
});
