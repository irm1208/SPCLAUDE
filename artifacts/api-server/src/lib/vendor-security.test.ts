import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { coseToJwk, decodeCbor, derToRaw, decryptSecret, encryptSecret, otpauthUri, parseAuthData, parseClientData } from "./vendor-security";
import { encodeCbor, rawToDer, syntheticAuthenticator } from "./vendor-security.test-helpers";
import { VendorPortalError } from "./vendor-portal-model";

const previousKey = process.env.ADMIN_TOTP_ENCRYPTION_KEY;
beforeAll(() => { process.env.ADMIN_TOTP_ENCRYPTION_KEY = "unit-test-key"; });
afterAll(() => { if (previousKey === undefined) delete process.env.ADMIN_TOTP_ENCRYPTION_KEY; else process.env.ADMIN_TOTP_ENCRYPTION_KEY = previousKey; });

describe("vendor security primitives", () => {
  it("round-trips encrypted secrets and builds a standard otpauth URI", () => {
    const secret = Buffer.from("0123456789abcdef0123");
    expect(decryptSecret(encryptSecret(secret)).equals(secret)).toBe(true);
    expect(otpauthUri("acme ops", secret)).toMatch(/^otpauth:\/\/totp\/Peps%20Anonymous%20Vendor%3Aacme%20ops\?secret=[A-Z2-7]+&issuer=Peps%20Anonymous%20Vendor&algorithm=SHA1&digits=6&period=30$/);
  });
  it("decodes CBOR maps, arrays, byte strings and negative ints", () => {
    const encoded = encodeCbor(new Map<any, any>([[1, 2], [3, -7], ["fmt", "none"], ["bytes", Buffer.from([1, 2, 3])], ["list", [1, 300, 70000]]]));
    const [value, consumed] = decodeCbor(encoded);
    expect(consumed).toBe(encoded.length);
    expect(value.get(1)).toBe(2); expect(value.get(3)).toBe(-7); expect(value.get("fmt")).toBe("none");
    expect(Buffer.from(value.get("bytes")).equals(Buffer.from([1, 2, 3]))).toBe(true); expect(value.get("list")).toEqual([1, 300, 70000]);
  });
  it("parses authenticator data and converts COSE keys to JWK", async () => {
    const auth = await syntheticAuthenticator("vendor.example");
    const [att] = decodeCbor(auth.attestationObject());
    const parsed = parseAuthData(att.get("authData"));
    expect(parsed.userPresent).toBe(true); expect(parsed.userVerified).toBe(true); expect(parsed.counter).toBe(0);
    expect(parsed.credentialId!.equals(auth.credentialId)).toBe(true);
    const { jwk, alg } = coseToJwk(parsed.cosePublicKey!);
    expect(alg).toBe(-7); expect(jwk).toMatchObject({ kty: "EC", crv: "P-256" }); expect(typeof jwk.x).toBe("string");
    expect(() => coseToJwk(new Map([[1, 1], [3, -8]]))).toThrow(VendorPortalError);
  });
  it("normalises DER signatures to raw r||s and leaves raw signatures alone", () => {
    const raw = Buffer.alloc(64, 7);
    expect(derToRaw(rawToDer(raw)).equals(raw)).toBe(true);
    const withHighBit = Buffer.concat([Buffer.alloc(32, 0x90), Buffer.alloc(32, 0x01)]);
    expect(derToRaw(rawToDer(withHighBit)).equals(withHighBit)).toBe(true);
    expect(derToRaw(raw)).toBe(raw);
  });
  it("rejects client data with the wrong type, challenge or origin", () => {
    const make = (o: object) => Buffer.from(JSON.stringify(o));
    expect(parseClientData(make({ type: "webauthn.get", challenge: "abc", origin: "https://peps.example/" }), "webauthn.get", "abc", "https://peps.example").type).toBe("webauthn.get");
    for (const bad of [{ type: "webauthn.create", challenge: "abc", origin: "https://peps.example" }, { type: "webauthn.get", challenge: "xyz", origin: "https://peps.example" }, { type: "webauthn.get", challenge: "abc", origin: "https://evil.example" }]) {
      expect(() => parseClientData(make(bad), "webauthn.get", "abc", "https://peps.example")).toThrow(VendorPortalError);
    }
  });
});
