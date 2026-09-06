import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { rename, unlink } from "fs/promises";
import { Transform, Readable, Writable } from "stream";
import { pipeline } from "stream/promises";
import { createGunzip, createGzip } from "zlib";

export const BACKUP_MAGIC = Buffer.from("SPBK");
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_IV_BYTES = 12;
export const BACKUP_TAG_BYTES = 16;

const HEADER_BYTES = BACKUP_MAGIC.length + 1 + BACKUP_IV_BYTES;

export interface EncryptedBackupMetadata {
  sizeBytes: number;
  sha256: string;
}

export function parseBackupEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32 || key.toString("base64") !== base64) {
    throw new Error("DB_BACKUP_ENCRYPTION_KEY must be canonical base64 for exactly 32 random bytes");
  }
  return key;
}

function assertEncryptionKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("Backup encryption key must contain exactly 32 bytes");
  }
}

function writeChunk(destination: Writable, chunk: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    destination.once("error", reject);
    if (destination.write(chunk)) {
      destination.removeListener("error", reject);
      resolve();
    } else {
      destination.once("drain", () => {
        destination.removeListener("error", reject);
        resolve();
      });
    }
  });
}

export async function encryptBackupStream(
  source: Readable,
  destinationPath: string,
  key: Buffer,
): Promise<EncryptedBackupMetadata> {
  assertEncryptionKey(key);
  const iv = randomBytes(BACKUP_IV_BYTES);
  const header = Buffer.concat([BACKUP_MAGIC, Buffer.from([BACKUP_FORMAT_VERSION]), iv]);
  const temporaryPath = `${destinationPath}.${process.pid}.${randomUUID()}.partial`;
  const hash = createHash("sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const destination = createWriteStream(temporaryPath, { flags: "wx" });
  let sizeBytes = 0;

  const hashCiphertext = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      sizeBytes += chunk.length;
      callback(null, chunk);
    },
  });

  try {
    hash.update(header);
    sizeBytes += header.length;
    await writeChunk(destination, header);
    await pipeline(source, createGzip(), cipher, hashCiphertext, destination, { end: false });

    const tag = cipher.getAuthTag();
    hash.update(tag);
    sizeBytes += tag.length;
    await writeChunk(destination, tag);
    await new Promise<void>((resolve, reject) => {
      destination.once("error", reject);
      destination.end(resolve);
    });
    await rename(temporaryPath, destinationPath);
    return { sizeBytes, sha256: hash.digest("hex") };
  } catch (error) {
    destination.destroy();
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function validateEnvelope(envelope: Buffer): { iv: Buffer; ciphertext: Buffer; tag: Buffer } {
  if (envelope.length < HEADER_BYTES + BACKUP_TAG_BYTES + 1) {
    throw new Error("Encrypted backup is truncated or missing its authentication tag");
  }
  if (!envelope.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error("Encrypted backup has invalid magic");
  }
  if (envelope[BACKUP_MAGIC.length] !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported encrypted backup format version: ${envelope[BACKUP_MAGIC.length]}`);
  }

  const iv = envelope.subarray(BACKUP_MAGIC.length + 1, HEADER_BYTES);
  const tag = envelope.subarray(-BACKUP_TAG_BYTES);
  const ciphertext = envelope.subarray(HEADER_BYTES, -BACKUP_TAG_BYTES);
  return { iv, ciphertext, tag };
}

async function gunzipFully(compressed: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await pipeline(
    Readable.from([compressed]),
    createGunzip(),
    new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }),
  );
  return Buffer.concat(chunks);
}

export async function decryptBackupToStream(sourcePath: string, key: Buffer): Promise<Readable> {
  assertEncryptionKey(key);
  const source = createReadStream(sourcePath);
  const chunks: Buffer[] = [];
  await pipeline(
    source,
    new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }),
  );
  const { iv, ciphertext, tag } = validateEnvelope(Buffer.concat(chunks));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const plaintext = await gunzipFully(compressed);
  return Readable.from([plaintext]);
}