import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { open, rename, stat, unlink } from "fs/promises";
import { PassThrough, Transform, Readable, Writable } from "stream";
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
  const destination = createWriteStream(temporaryPath, { flags: "wx", mode: 0o600 });
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
    return removeTemporaryFile(temporaryPath, error);
  }
}

function validateEnvelopeHeader(header: Buffer, sizeBytes: number): Buffer {
  if (sizeBytes < HEADER_BYTES + BACKUP_TAG_BYTES + 1) {
    throw new Error("Encrypted backup is truncated or missing its authentication tag");
  }
  if (!header.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error("Encrypted backup has invalid magic");
  }
  if (header[BACKUP_MAGIC.length] !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported encrypted backup format version: ${header[BACKUP_MAGIC.length]}`);
  }
  return header.subarray(BACKUP_MAGIC.length + 1, HEADER_BYTES);
}

async function removeTemporaryFile(temporaryPath: string, originalError: unknown): Promise<never> {
  try {
    await unlink(temporaryPath);
  } catch (cleanupError) {
    if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new AggregateError(
        [originalError, cleanupError],
        "Encrypted backup processing failed and its temporary file could not be removed",
      );
    }
  }
  throw originalError;
}

export async function decryptBackupToStream(sourcePath: string, key: Buffer): Promise<Readable> {
  assertEncryptionKey(key);
  const { size: sourceSize } = await stat(sourcePath);
  const handle = await open(sourcePath, "r");
  const header = Buffer.alloc(HEADER_BYTES);
  const tag = Buffer.alloc(BACKUP_TAG_BYTES);
  try {
    const headerRead = await handle.read(header, 0, header.length, 0);
    const tagRead = await handle.read(tag, 0, tag.length, sourceSize - tag.length);
    if (headerRead.bytesRead !== header.length || tagRead.bytesRead !== tag.length) {
      throw new Error("Encrypted backup is truncated or missing its authentication tag");
    }
  } finally {
    await handle.close();
  }

  const iv = validateEnvelopeHeader(header, sourceSize);
  const temporaryPath = `${sourcePath}.${process.pid}.${randomUUID()}.restore.partial`;
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    await pipeline(
      createReadStream(sourcePath, {
        start: HEADER_BYTES,
        end: sourceSize - BACKUP_TAG_BYTES - 1,
      }),
      decipher,
      createWriteStream(temporaryPath, { flags: "wx", mode: 0o600 }),
    );
  } catch (error) {
    return removeTemporaryFile(temporaryPath, error);
  }

  const output = new PassThrough();
  const removeStagedData = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      callback(null, chunk);
    },
    flush(callback) {
      unlink(temporaryPath).then(
        () => callback(),
        cleanupError => callback(cleanupError),
      );
    },
  });
  void pipeline(createReadStream(temporaryPath), createGunzip(), removeStagedData, output)
    .catch(async error => {
      try {
        await removeTemporaryFile(temporaryPath, error);
      } catch (processingError) {
        output.destroy(processingError as Error);
      }
    });
  return output;
}