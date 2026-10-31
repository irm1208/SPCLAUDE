import { createHash, webcrypto } from "node:crypto";
import { b64u } from "./vendor-security";

/* Synthetic WebAuthn authenticator and CBOR/DER helpers shared by unit and integration tests. */
/** Tiny CBOR encoder for the test fixtures (maps, arrays, byte strings, text, ints). */
export function encodeCbor(value: any): Buffer {
  const head = (major: number, n: number) => n < 24 ? Buffer.from([major << 5 | n]) : n < 256 ? Buffer.from([major << 5 | 24, n]) : n < 65536 ? Buffer.from([major << 5 | 25, n >> 8, n & 255]) : Buffer.from([major << 5 | 26, n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]);
  if (typeof value === "number") return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (typeof value === "string") { const b = Buffer.from(value, "utf8"); return Buffer.concat([head(3, b.length), b]); }
  if (Array.isArray(value)) return Buffer.concat([head(4, value.length), ...value.map(encodeCbor)]);
  if (value instanceof Map) return Buffer.concat([head(5, value.size), ...[...value.entries()].flatMap(([k, v]) => [encodeCbor(k), encodeCbor(v)])]);
  if (value && typeof value === "object") return encodeCbor(new Map(Object.entries(value)));
  throw new Error("unsupported");
}
export function rawToDer(raw: Buffer): Buffer {
  const int = (v: Buffer) => { let s = v; while (s.length > 1 && s[0] === 0 && !(s[1] & 0x80)) s = s.subarray(1); if (s[0] & 0x80) s = Buffer.concat([Buffer.from([0]), s]); return Buffer.concat([Buffer.from([2, s.length]), s]); };
  const body = Buffer.concat([int(raw.subarray(0, 32)), int(raw.subarray(32))]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}
export async function syntheticAuthenticator(rpId: string) {
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
  const cose = new Map<number, any>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, "base64url")], [-3, Buffer.from(jwk.y!, "base64url")]]);
  const credentialId = Buffer.from(`cred-${Math.random().toString(36).slice(2, 10)}`);
  const rpIdHash = createHash("sha256").update(rpId).digest();
  let counter = 0;
  return {
    credentialId,
    attestationObject(flags = 0x45) {
      const authData = Buffer.concat([rpIdHash, Buffer.from([flags]), Buffer.from([0, 0, 0, 0]), Buffer.alloc(16), Buffer.from([credentialId.length >> 8, credentialId.length & 255]), credentialId, encodeCbor(cose)]);
      return encodeCbor({ fmt: "none", attStmt: {}, authData });
    },
    async assertion(clientDataJSON: Buffer, flags = 0x05) {
      counter += 1;
      const c = Buffer.alloc(4); c.writeUInt32BE(counter);
      const authData = Buffer.concat([rpIdHash, Buffer.from([flags]), c]);
      const signed = Buffer.concat([authData, createHash("sha256").update(clientDataJSON).digest()]);
      const raw = Buffer.from(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, signed));
      return { authenticatorData: b64u.encode(authData), signature: b64u.encode(rawToDer(raw)) };
    },
  };
}
