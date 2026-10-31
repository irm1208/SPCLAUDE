import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomUUID, timingSafeEqual, webcrypto } from "node:crypto";
type JsonWebKey = webcrypto.JsonWebKey;
import { and, eq, lt } from "drizzle-orm";
import type { Request } from "express";
import { db, vendorMfaChallengesTable, vendorPasskeysTable, vendorTotpTable } from "@workspace/db";
import { base32Encode, generateRecoveryCodes, generateOpaqueToken, hashOpaqueToken, hashRecoveryCode, verifyRecoveryCode, verifyTotp } from "./admin-2fa";
import { VendorPortalError } from "./vendor-portal-model";

/* ---------------------------------------------------------------------------
 * Vendor account security: authenticator-app codes (TOTP), passkeys (WebAuthn)
 * and the short-lived challenges that tie a password check to a second factor.
 * WebAuthn is verified here directly (CBOR + COSE + WebCrypto) because no
 * WebAuthn library is installed; attestation is accepted as "none".
 * ------------------------------------------------------------------------- */
type Executor = any;
export const ISSUER = "Peps Anonymous Vendor";
const LOGIN_TTL_MS = 5 * 60_000, PASSKEY_TTL_MS = 5 * 60_000;

/* ---- Secret encryption (same key as admin 2FA, separate derivation) ---------- */
export function securityConfigured() { return typeof process.env["ADMIN_TOTP_ENCRYPTION_KEY"] === "string" && process.env["ADMIN_TOTP_ENCRYPTION_KEY"]!.length > 0; }
function encryptionKey() {
  const configured = process.env["ADMIN_TOTP_ENCRYPTION_KEY"];
  if (!configured) throw new VendorPortalError("Two-step verification is not available yet. Ask Peps Anonymous to configure it.", 503);
  return Buffer.from(hkdfSync("sha256", Buffer.from(configured), Buffer.from("peps-vendor-totp"), Buffer.from("aes-256-gcm"), 32));
}
export function encryptSecret(secret: Buffer): string {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(p => p.toString("base64url")).join(".");
}
export function decryptSecret(payload: string): Buffer {
  const [iv, tag, body] = payload.split(".");
  if (!iv || !tag || !body) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]);
}

/* ---- Methods summary ----------------------------------------------------------- */
export async function mfaMethods(tx: Executor, username: string): Promise<{ totp: boolean; passkeys: number }> {
  const [totp] = await tx.select({ enabledAt: vendorTotpTable.enabledAt }).from(vendorTotpTable).where(eq(vendorTotpTable.username, username));
  const keys = await tx.select({ id: vendorPasskeysTable.id }).from(vendorPasskeysTable).where(eq(vendorPasskeysTable.username, username));
  return { totp: !!totp?.enabledAt, passkeys: keys.length };
}
export async function securityOverview(tx: Executor, username: string) {
  const [totp] = await tx.select().from(vendorTotpTable).where(eq(vendorTotpTable.username, username));
  const passkeys = await listPasskeys(tx, username);
  return {
    available: securityConfigured(),
    totp: { enabled: !!totp?.enabledAt, pending: !!totp && !totp.enabledAt, recoveryCodesRemaining: totp?.enabledAt ? (totp.recoveryCodes ?? []).length : 0, enabledAt: totp?.enabledAt ?? null },
    passkeys,
  };
}

/* ---- TOTP ----------------------------------------------------------------------- */
export function otpauthUri(username: string, secret: Buffer) {
  const label = encodeURIComponent(`${ISSUER}:${username}`);
  return `otpauth://totp/${label}?secret=${base32Encode(secret)}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
}
export async function beginTotp(tx: Executor, username: string) {
  const [existing] = await tx.select().from(vendorTotpTable).where(eq(vendorTotpTable.username, username));
  if (existing?.enabledAt) throw new VendorPortalError("An authenticator app is already enabled. Disable it first to set up a new one.", 409);
  const secret = randomBytes(20);
  const values = { secretEnc: encryptSecret(secret), enabledAt: null, lastStep: null, recoveryCodes: [] as string[], updatedAt: new Date() };
  await tx.insert(vendorTotpTable).values({ username, ...values }).onConflictDoUpdate({ target: vendorTotpTable.username, set: values });
  return { manualKey: base32Encode(secret).replace(/(.{4})/g, "$1 ").trim(), otpauthUri: otpauthUri(username, secret) };
}
export async function confirmTotp(tx: Executor, username: string, code: unknown) {
  const [row] = await tx.select().from(vendorTotpTable).where(eq(vendorTotpTable.username, username)).for("update");
  if (!row) throw new VendorPortalError("Start the authenticator setup first.", 409);
  if (row.enabledAt) throw new VendorPortalError("An authenticator app is already enabled.", 409);
  const result = verifyTotp(decryptSecret(row.secretEnc), String(code ?? "").replace(/\s+/g, ""));
  if (!result.valid) throw new VendorPortalError("That code is not right. Check the time on your phone and try the newest code.", 400);
  const codes = generateRecoveryCodes(8);
  await tx.update(vendorTotpTable).set({ enabledAt: new Date(), lastStep: result.step, recoveryCodes: await Promise.all(codes.map(hashRecoveryCode)), updatedAt: new Date() })
    .where(eq(vendorTotpTable.username, username));
  return codes;
}
export async function regenerateRecoveryCodes(tx: Executor, username: string) {
  const [row] = await tx.select().from(vendorTotpTable).where(eq(vendorTotpTable.username, username)).for("update");
  if (!row?.enabledAt) throw new VendorPortalError("Authenticator app is not enabled.", 409);
  const codes = generateRecoveryCodes(8);
  await tx.update(vendorTotpTable).set({ recoveryCodes: await Promise.all(codes.map(hashRecoveryCode)), updatedAt: new Date() }).where(eq(vendorTotpTable.username, username));
  return codes;
}
export async function disableTotp(tx: Executor, username: string) {
  await tx.delete(vendorTotpTable).where(eq(vendorTotpTable.username, username));
}
/** Accepts a six-digit authenticator code (replay-protected) or an unused recovery code. */
export async function verifyTotpOrRecovery(tx: Executor, username: string, input: unknown): Promise<{ ok: true; recovery: boolean; remaining: number } | { ok: false }> {
  const code = String(input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const [row] = await tx.select().from(vendorTotpTable).where(eq(vendorTotpTable.username, username)).for("update");
  if (!row?.enabledAt) return { ok: false };
  if (/^\d{6}$/.test(code)) {
    const result = verifyTotp(decryptSecret(row.secretEnc), code);
    if (!result.valid || (row.lastStep != null && result.step <= row.lastStep)) return { ok: false };
    await tx.update(vendorTotpTable).set({ lastStep: result.step, updatedAt: new Date() }).where(eq(vendorTotpTable.username, username));
    return { ok: true, recovery: false, remaining: (row.recoveryCodes ?? []).length };
  }
  const normalized = code.replace(/[^A-Z0-9]/g, "").replace(/^(.{4})(.{4})$/, "$1-$2");
  const hashes: string[] = row.recoveryCodes ?? [];
  for (let i = 0; i < hashes.length; i++) {
    if (await verifyRecoveryCode(normalized, hashes[i])) {
      const remaining = hashes.filter((_, j) => j !== i);
      await tx.update(vendorTotpTable).set({ recoveryCodes: remaining, updatedAt: new Date() }).where(eq(vendorTotpTable.username, username));
      return { ok: true, recovery: true, remaining: remaining.length };
    }
  }
  return { ok: false };
}

/* ---- Challenges ------------------------------------------------------------------ */
export async function createChallenge(tx: Executor, username: string | null, kind: string, data: Record<string, unknown>, ttlMs: number) {
  const token = generateOpaqueToken(32);
  await tx.delete(vendorMfaChallengesTable).where(lt(vendorMfaChallengesTable.expiresAt, new Date())).catch(() => undefined);
  await tx.insert(vendorMfaChallengesTable).values({ tokenHash: hashOpaqueToken(token), username, kind, data, expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}
export async function consumeChallenge(tx: Executor, token: unknown, kind: string) {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) return null;
  const rows = await tx.delete(vendorMfaChallengesTable).where(and(eq(vendorMfaChallengesTable.tokenHash, hashOpaqueToken(token)), eq(vendorMfaChallengesTable.kind, kind))).returning();
  const row = rows[0];
  if (!row || new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row as { username: string | null; data: Record<string, unknown> };
}

/* ---- WebAuthn: encoding helpers (pure) -------------------------------------------- */
export const b64u = {
  encode: (value: ArrayBuffer | Uint8Array | Buffer) => Buffer.from(value as any).toString("base64url"),
  decode: (value: unknown) => { if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value)) throw new VendorPortalError("Malformed passkey data.", 400); return Buffer.from(value, "base64url"); },
};
/** Minimal CBOR decoder covering what authenticator data uses. Returns the value and bytes consumed. */
export function decodeCbor(buf: Buffer, offset = 0): [any, number] {
  const first = buf[offset]; if (first === undefined) throw new VendorPortalError("Malformed passkey data.", 400);
  const major = first >> 5, info = first & 31;
  let pos = offset + 1, length = info;
  if (info === 24) { length = buf[pos]; pos += 1; }
  else if (info === 25) { length = buf.readUInt16BE(pos); pos += 2; }
  else if (info === 26) { length = buf.readUInt32BE(pos); pos += 4; }
  else if (info === 27) { length = Number(buf.readBigUInt64BE(pos)); pos += 8; }
  else if (info > 27) throw new VendorPortalError("Malformed passkey data.", 400);
  switch (major) {
    case 0: return [length, pos - offset];
    case 1: return [-1 - length, pos - offset];
    case 2: return [buf.subarray(pos, pos + length), pos + length - offset];
    case 3: return [buf.subarray(pos, pos + length).toString("utf8"), pos + length - offset];
    case 4: { const out: any[] = []; for (let i = 0; i < length; i++) { const [v, n] = decodeCbor(buf, pos); out.push(v); pos += n; } return [out, pos - offset]; }
    case 5: { const out = new Map<any, any>(); for (let i = 0; i < length; i++) { const [k, kn] = decodeCbor(buf, pos); pos += kn; const [v, vn] = decodeCbor(buf, pos); pos += vn; out.set(k, v); } return [out, pos - offset]; }
    case 7: return [info === 20 ? false : info === 21 ? true : null, pos - offset];
    default: throw new VendorPortalError("Unsupported passkey data.", 400);
  }
}
export interface AuthData { rpIdHash: Buffer; flags: number; userPresent: boolean; userVerified: boolean; counter: number; credentialId?: Buffer; cosePublicKey?: Map<any, any> }
export function parseAuthData(data: Buffer): AuthData {
  if (data.length < 37) throw new VendorPortalError("Malformed authenticator data.", 400);
  const flags = data[32];
  const out: AuthData = { rpIdHash: data.subarray(0, 32), flags, userPresent: !!(flags & 1), userVerified: !!(flags & 4), counter: data.readUInt32BE(33) };
  if (flags & 64) {
    const idLength = data.readUInt16BE(53);
    out.credentialId = data.subarray(55, 55 + idLength);
    const [key] = decodeCbor(data, 55 + idLength);
    if (!(key instanceof Map)) throw new VendorPortalError("Malformed credential public key.", 400);
    out.cosePublicKey = key;
  }
  return out;
}
export function coseToJwk(cose: Map<any, any>): { jwk: JsonWebKey; alg: number } {
  const kty = cose.get(1), alg = cose.get(3);
  if (kty === 2 && alg === -7 && cose.get(-1) === 1) {
    return { alg, jwk: { kty: "EC", crv: "P-256", x: b64u.encode(cose.get(-2)), y: b64u.encode(cose.get(-3)) } };
  }
  if (kty === 3 && alg === -257) return { alg, jwk: { kty: "RSA", n: b64u.encode(cose.get(-1)), e: b64u.encode(cose.get(-2)) } };
  throw new VendorPortalError("This passkey uses an unsupported algorithm. Try a different device or browser.", 400);
}
/** ECDSA signatures arrive DER-encoded; WebCrypto wants raw r||s. */
export function derToRaw(sig: Buffer, size = 32): Buffer {
  if (sig[0] !== 0x30) return sig;
  let pos = 2; if (sig[1] & 0x80) pos += sig[1] & 0x7f;
  const read = () => { if (sig[pos++] !== 0x02) throw new VendorPortalError("Malformed signature.", 400); const len = sig[pos++]; let v = sig.subarray(pos, pos + len); pos += len; while (v.length > size && v[0] === 0) v = v.subarray(1); return Buffer.concat([Buffer.alloc(size - v.length), v]); };
  const r = read(), s = read();
  return Buffer.concat([r, s]);
}
export function parseClientData(raw: Buffer, expectedType: string, expectedChallenge: string, origin: string) {
  let data: any;
  try { data = JSON.parse(raw.toString("utf8")); } catch { throw new VendorPortalError("Malformed passkey data.", 400); }
  if (data.type !== expectedType) throw new VendorPortalError("Unexpected passkey ceremony.", 400);
  if (typeof data.challenge !== "string" || data.challenge !== expectedChallenge) throw new VendorPortalError("Passkey challenge did not match. Try again.", 400);
  if (typeof data.origin !== "string" || data.origin.replace(/\/+$/, "") !== origin) throw new VendorPortalError("Passkey origin did not match this site.", 400);
  return data;
}
export function relyingParty(req: Request): { rpId: string; origin: string; name: string } {
  const configured = (process.env["PUBLIC_URL"] ?? "").trim();
  const host = (configured ? configured.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : (req.get("x-forwarded-host") ?? req.get("host") ?? "localhost")).split(",")[0].trim();
  const proto = configured ? "https" : ((req.get("x-forwarded-proto") ?? req.protocol ?? "http").split(",")[0].trim());
  return { rpId: host.replace(/:\d+$/, ""), origin: `${proto}://${host}`, name: ISSUER };
}
async function verifySignature(jwk: JsonWebKey, alg: number, signed: Buffer, signature: Buffer) {
  const subtle = webcrypto.subtle;
  if (alg === -7) {
    const key = await subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, new Uint8Array(derToRaw(signature)), new Uint8Array(signed));
  }
  const key = await subtle.importKey("jwk", { ...jwk, alg: "RS256" }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return subtle.verify("RSASSA-PKCS1-v1_5", key, new Uint8Array(signature), new Uint8Array(signed));
}

/* ---- WebAuthn: ceremonies ------------------------------------------------------- */
export function publicPasskey(row: any) {
  return { id: row.id, name: row.name, transports: row.transports ?? [], createdAt: row.createdAt, lastUsedAt: row.lastUsedAt ?? null };
}
export async function listPasskeys(tx: Executor, username: string) {
  const rows = await tx.select().from(vendorPasskeysTable).where(eq(vendorPasskeysTable.username, username)).orderBy(vendorPasskeysTable.createdAt);
  return rows.map(publicPasskey);
}
export async function passkeyRegistrationOptions(tx: Executor, username: string, displayName: string, rp: { rpId: string; name: string }) {
  const existing = await tx.select({ credentialId: vendorPasskeysTable.credentialId, transports: vendorPasskeysTable.transports }).from(vendorPasskeysTable).where(eq(vendorPasskeysTable.username, username));
  if (existing.length >= 10) throw new VendorPortalError("You can register up to 10 passkeys. Remove one first.", 409);
  const challenge = b64u.encode(randomBytes(32));
  await tx.insert(vendorMfaChallengesTable).values({ tokenHash: hashOpaqueToken(challenge), username, kind: "passkey-register", data: {}, expiresAt: new Date(Date.now() + PASSKEY_TTL_MS) });
  return {
    challenge, rp: { id: rp.rpId, name: rp.name },
    user: { id: b64u.encode(Buffer.from(`vendor:${username}`)), name: username, displayName: displayName || username },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    excludeCredentials: existing.map((e: any) => ({ type: "public-key", id: e.credentialId, transports: e.transports ?? [] })),
    attestation: "none", timeout: 60_000,
  };
}
export async function verifyPasskeyRegistration(tx: Executor, username: string, rp: { rpId: string; origin: string }, credential: any, name: unknown) {
  const response = credential?.response ?? {};
  const clientData = b64u.decode(response.clientDataJSON);
  const challenge = JSON.parse(clientData.toString("utf8"))?.challenge;
  const pending = await consumeChallenge(tx, challenge, "passkey-register");
  if (!pending || pending.username !== username) throw new VendorPortalError("Passkey setup expired. Start again.", 400);
  parseClientData(clientData, "webauthn.create", challenge, rp.origin);
  const [attestation] = decodeCbor(b64u.decode(response.attestationObject));
  if (!(attestation instanceof Map) || !Buffer.isBuffer(attestation.get("authData"))) throw new VendorPortalError("Malformed attestation.", 400);
  const authData = parseAuthData(attestation.get("authData"));
  if (!authData.rpIdHash.equals(createHash("sha256").update(rp.rpId).digest())) throw new VendorPortalError("Passkey was created for a different site.", 400);
  if (!authData.userPresent || !authData.credentialId || !authData.cosePublicKey) throw new VendorPortalError("Passkey was not confirmed on the device.", 400);
  const { jwk, alg } = coseToJwk(authData.cosePublicKey);
  const credentialId = b64u.encode(authData.credentialId);
  const label = typeof name === "string" && name.trim() ? name.trim().slice(0, 60) : `Passkey ${new Date().toLocaleDateString("en-GB")}`;
  const transports = Array.isArray(response.transports) ? response.transports.filter((t: unknown) => typeof t === "string").slice(0, 6) : [];
  const [row] = await tx.insert(vendorPasskeysTable).values({ id: randomUUID(), username, credentialId, publicKey: jwk as Record<string, unknown>, algorithm: alg, counter: authData.counter, transports, name: label })
    .onConflictDoNothing().returning();
  if (!row) throw new VendorPortalError("This passkey is already registered.", 409);
  return publicPasskey(row);
}
export async function passkeyAuthenticationOptions(tx: Executor, rp: { rpId: string }, username?: string | null) {
  const allow = username ? await tx.select({ credentialId: vendorPasskeysTable.credentialId, transports: vendorPasskeysTable.transports }).from(vendorPasskeysTable).where(eq(vendorPasskeysTable.username, username)) : [];
  const challenge = b64u.encode(randomBytes(32));
  await tx.insert(vendorMfaChallengesTable).values({ tokenHash: hashOpaqueToken(challenge), username: username ?? null, kind: "passkey-login", data: {}, expiresAt: new Date(Date.now() + PASSKEY_TTL_MS) });
  return { challenge, rpId: rp.rpId, userVerification: "preferred", timeout: 60_000, allowCredentials: allow.map((a: any) => ({ type: "public-key", id: a.credentialId, transports: a.transports ?? [] })) };
}
/** Verifies an assertion and returns the owning username. */
export async function verifyPasskeyAuthentication(tx: Executor, rp: { rpId: string; origin: string }, credential: any) {
  const response = credential?.response ?? {};
  const clientData = b64u.decode(response.clientDataJSON);
  const challenge = JSON.parse(clientData.toString("utf8"))?.challenge;
  const pending = await consumeChallenge(tx, challenge, "passkey-login");
  if (!pending) throw new VendorPortalError("Passkey sign-in expired. Try again.", 400);
  parseClientData(clientData, "webauthn.get", challenge, rp.origin);
  const credentialId = b64u.encode(b64u.decode(credential?.rawId ?? credential?.id));
  const [row] = await tx.select().from(vendorPasskeysTable).where(eq(vendorPasskeysTable.credentialId, credentialId)).for("update");
  if (!row || (pending.username && pending.username !== row.username)) throw new VendorPortalError("This passkey is not registered with a vendor account.", 401);
  const authDataRaw = b64u.decode(response.authenticatorData);
  const authData = parseAuthData(authDataRaw);
  if (!authData.rpIdHash.equals(createHash("sha256").update(rp.rpId).digest())) throw new VendorPortalError("Passkey belongs to a different site.", 400);
  if (!authData.userPresent) throw new VendorPortalError("Passkey was not confirmed on the device.", 400);
  const signed = Buffer.concat([authDataRaw, createHash("sha256").update(clientData).digest()]);
  const valid = await verifySignature(row.publicKey as JsonWebKey, row.algorithm, signed, b64u.decode(response.signature)).catch(() => false);
  if (!valid) throw new VendorPortalError("Passkey signature was rejected.", 401);
  if (authData.counter !== 0 && row.counter !== 0 && authData.counter <= row.counter) throw new VendorPortalError("This passkey looks cloned; sign-in was refused. Remove and re-register it.", 401);
  await tx.update(vendorPasskeysTable).set({ counter: authData.counter, lastUsedAt: new Date() }).where(eq(vendorPasskeysTable.id, row.id));
  return { username: row.username as string, passkeyId: row.id as string };
}
export async function renamePasskey(tx: Executor, username: string, id: string, name: unknown) {
  const label = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!label) throw new VendorPortalError("Give the passkey a name.");
  const [row] = await tx.update(vendorPasskeysTable).set({ name: label }).where(and(eq(vendorPasskeysTable.id, id), eq(vendorPasskeysTable.username, username))).returning();
  if (!row) throw new VendorPortalError("Passkey not found.", 404);
  return publicPasskey(row);
}
export async function deletePasskey(tx: Executor, username: string, id: string) {
  const rows = await tx.delete(vendorPasskeysTable).where(and(eq(vendorPasskeysTable.id, id), eq(vendorPasskeysTable.username, username))).returning({ id: vendorPasskeysTable.id });
  if (!rows.length) throw new VendorPortalError("Passkey not found.", 404);
}
/** Admin recovery for a locked-out vendor: removes every second factor. */
export async function resetVendorSecurity(tx: Executor, username: string) {
  await tx.delete(vendorTotpTable).where(eq(vendorTotpTable.username, username));
  const removed = await tx.delete(vendorPasskeysTable).where(eq(vendorPasskeysTable.username, username)).returning({ id: vendorPasskeysTable.id });
  return removed.length;
}
export function constantTimeEqual(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export const LOGIN_CHALLENGE_TTL = LOGIN_TTL_MS;
export { db };
