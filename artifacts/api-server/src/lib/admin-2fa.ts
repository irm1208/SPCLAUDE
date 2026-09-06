import { createCipheriv, createDecipheriv, createHmac, createHash, hkdfSync, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const STEP_MS = 30_000;
const scryptAsync = promisify(scrypt);
const SCRYPT_N = 2 ** 15, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEY_BYTES = 32;

export function base32Encode(value: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, buffer = 0, result = "";
  for (const byte of value) {
    buffer = (buffer << 8) | byte; bits += 8;
    while (bits >= 5) { result += alphabet[(buffer >>> (bits -= 5)) & 31]; }
  }
  if (bits) result += alphabet[(buffer << (5 - bits)) & 31];
  return result;
}

export function base32Decode(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[=\s-]/g, "");
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error("Invalid base32 value");
  let bits = 0, buffer = 0; const out: number[] = [];
  for (const char of clean) {
    buffer = (buffer << 5) | alphabet.indexOf(char); bits += 5;
    if (bits >= 8) out.push((buffer >>> (bits -= 8)) & 255);
  }
  return Buffer.from(out);
}

export function generateTotp(secret: Buffer, now = Date.now()): string {
  const counter = Math.floor(now / STEP_MS);
  const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", secret).update(input).digest();
  const offset = hash[19]! & 15;
  const number = ((hash[offset]! & 127) << 24 | hash[offset + 1]! << 16 | hash[offset + 2]! << 8 | hash[offset + 3]!) % 1_000_000;
  return String(number).padStart(6, "0");
}

export function verifyTotp(secret: Buffer, code: string, now = Date.now()): { valid: true; step: number } | { valid: false } {
  if (!/^\d{6}$/.test(code)) return { valid: false };
  for (let offset = -1; offset <= 1; offset++) {
    const time = now + offset * STEP_MS;
    const candidate = generateTotp(secret, time);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(candidate))) return { valid: true, step: Math.floor(time / STEP_MS) };
  }
  return { valid: false };
}

function encryptionKey(): Buffer {
  const configured = process.env["ADMIN_TOTP_ENCRYPTION_KEY"];
  if (!configured) throw new Error("ADMIN_TOTP_ENCRYPTION_KEY is required for admin 2FA");
  return Buffer.from(hkdfSync("sha256", Buffer.from(configured), Buffer.from("peps-admin-totp"), Buffer.from("aes-256-gcm"), 32));
}
export function isAdminTotpEncryptionConfigured(): boolean {
  return typeof process.env["ADMIN_TOTP_ENCRYPTION_KEY"] === "string" && process.env["ADMIN_TOTP_ENCRYPTION_KEY"]!.length > 0;
}

export function encryptTotpSecret(secret: Buffer): string {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]); const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(p => p.toString("base64url")).join(".");
}

export function decryptTotpSecret(payload: string): Buffer {
  const [ivText, tagText, bodyText] = payload.split(".");
  if (!ivText || !tagText || !bodyText) throw new Error("Invalid encrypted TOTP secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyText, "base64url")), decipher.final()]);
}

export function generateOpaqueToken(bytes = 32): string { return randomBytes(bytes).toString("base64url"); }
export function hashOpaqueToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => `${randomBytes(4).toString("hex").slice(0, 4)}-${randomBytes(4).toString("hex").slice(0, 4)}`.toUpperCase());
}
// Built-in scrypt avoids a new native dependency while providing memory-hard
// storage with parameters bounded for the deployment's memory constraints.
export async function hashAdminCredential(value: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(value, salt, SCRYPT_KEY_BYTES, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024,
  }) as Buffer;
  return `scrypt$v1$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}
export async function verifyAdminCredential(value: string, encoded: string): Promise<boolean> {
  const [algorithm, version, nText, rText, pText, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || version !== "v1" || !saltText || !hashText) return false;
  const N = Number(nText), r = Number(rText), p = Number(pText);
  if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false;
  let salt: Buffer, expected: Buffer;
  try { salt = Buffer.from(saltText, "base64url"); expected = Buffer.from(hashText, "base64url"); } catch { return false; }
  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_BYTES) return false;
  const actual = await scryptAsync(value, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return timingSafeEqual(actual, expected);
}
export async function hashRecoveryCode(code: string): Promise<string> { return hashAdminCredential(code); }
export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> { return verifyAdminCredential(code, hash); }