import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotp, hashAdminCredential, verifyAdminCredential, verifyTotp } from "./admin-2fa";

describe("admin TOTP primitives", () => {
  it("implements the RFC 6238 SHA-1 six digit vector", () => {
    const secret = Buffer.from("12345678901234567890");
    expect(generateTotp(secret, 59_000)).toBe("287082");
  });

  it("round-trips base32 and accepts only a one-step clock window", () => {
    const secret = Buffer.from("hello admin");
    expect(base32Decode(base32Encode(secret))).toEqual(secret);
    const code = generateTotp(secret, 60_000);
    expect(verifyTotp(secret, code, 90_000)).toEqual({ valid: true, step: 2 });
    expect(verifyTotp(secret, code, 150_000)).toEqual({ valid: false });
  });

  it("uses salted memory-hard hashes and rejects a wrong credential", async () => {
    const first = await hashAdminCredential("correct horse battery staple");
    const second = await hashAdminCredential("correct horse battery staple");
    expect(first).toMatch(/^scrypt\$v1\$32768\$8\$1\$/);
    expect(second).not.toBe(first);
    await expect(verifyAdminCredential("correct horse battery staple", first)).resolves.toBe(true);
    await expect(verifyAdminCredential("wrong password", first)).resolves.toBe(false);
    await expect(verifyAdminCredential("anything", "not-a-supported-hash")).resolves.toBe(false);
  });
});