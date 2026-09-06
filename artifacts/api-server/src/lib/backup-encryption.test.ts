import { createHash } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { describe, expect, it, afterEach } from "vitest";
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_IV_BYTES,
  BACKUP_MAGIC,
  BACKUP_TAG_BYTES,
  decryptBackupToStream,
  encryptBackupStream,
  parseBackupEncryptionKey,
} from "./backup-encryption";

const plaintext = Buffer.from(
  "CREATE TABLE backup_test (id integer PRIMARY KEY, note text);\nINSERT INTO backup_test VALUES (1, 'sensitive SQL data');\n",
);
const key = Buffer.alloc(32, 7);
const wrongKey = Buffer.alloc(32, 8);
const temporaryDirectories: string[] = [];

async function createTemporaryPath(name: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "backup-encryption-test-"));
  temporaryDirectories.push(directory);
  return join(directory, name);
}

async function readRestoredSql(path: string, decryptionKey = key): Promise<Buffer> {
  const stream = await decryptBackupToStream(path, decryptionKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function expectRejectedWithoutSql(path: string): Promise<void> {
  await expect(decryptBackupToStream(path, key)).rejects.toThrow();
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true })));
});

describe("backup encryption", () => {
  it("accepts exactly 32 canonical base64-decoded bytes", () => {
    expect(parseBackupEncryptionKey(key.toString("base64"))).toHaveLength(32);
    expect(() => parseBackupEncryptionKey("bad")).toThrow(/32 random bytes/);
    expect(() => parseBackupEncryptionKey(key.toString("base64").replace(/=/g, ""))).toThrow(/32 random bytes/);
  });

  it("uses a fresh IV so identical SQL produces different ciphertext", async () => {
    const firstPath = await createTemporaryPath("first.enc");
    const secondPath = await createTemporaryPath("second.enc");

    await encryptBackupStream(Readable.from([plaintext]), firstPath, key);
    await encryptBackupStream(Readable.from([plaintext]), secondPath, key);

    const firstCiphertext = await readFile(firstPath);
    const secondCiphertext = await readFile(secondPath);
    expect(firstCiphertext).not.toEqual(secondCiphertext);
    expect(firstCiphertext.subarray(0, 4)).toEqual(BACKUP_MAGIC);
    expect(firstCiphertext[4]).toBe(BACKUP_FORMAT_VERSION);
    expect(firstCiphertext.subarray(5, 5 + BACKUP_IV_BYTES)).toHaveLength(BACKUP_IV_BYTES);
  });

  it("round-trips SQL without storing plaintext in the envelope", async () => {
    const path = await createTemporaryPath("backup.enc");
    const metadata = await encryptBackupStream(Readable.from([plaintext]), path, key);
    const ciphertext = await readFile(path);

    expect(await readRestoredSql(path)).toEqual(plaintext);
    expect(ciphertext.includes(plaintext)).toBe(false);
    expect(metadata.sizeBytes).toBe(ciphertext.length);
    expect(metadata.sha256).toBe(createHash("sha256").update(ciphertext).digest("hex"));
  });

  it.each([
    ["wrong key", (envelope: Buffer) => envelope, wrongKey],
    ["one-byte mutation", (envelope: Buffer) => {
      const result = Buffer.from(envelope);
      result[5 + BACKUP_IV_BYTES] ^= 1;
      return result;
    }, key],
    ["truncated ciphertext", (envelope: Buffer) => envelope.subarray(0, -1), key],
    ["malformed magic", (envelope: Buffer) => {
      const result = Buffer.from(envelope);
      result[0] ^= 1;
      return result;
    }, key],
    ["unsupported version", (envelope: Buffer) => {
      const result = Buffer.from(envelope);
      result[4] = BACKUP_FORMAT_VERSION + 1;
      return result;
    }, key],
    ["missing authentication tag", (envelope: Buffer) => envelope.subarray(0, -BACKUP_TAG_BYTES), key],
  ] as const)("rejects %s before returning a restored SQL stream", async (_name, corrupt, decryptionKey) => {
    const sourcePath = await createTemporaryPath("source.enc");
    const corruptPath = await createTemporaryPath("corrupt.enc");
    await encryptBackupStream(Readable.from([plaintext]), sourcePath, key);
    await writeFile(corruptPath, corrupt(await readFile(sourcePath)));

    if (decryptionKey === key) {
      await expectRejectedWithoutSql(corruptPath);
    } else {
      await expect(decryptBackupToStream(corruptPath, decryptionKey)).rejects.toThrow();
    }
  });
});