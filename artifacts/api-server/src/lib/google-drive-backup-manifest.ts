import { createHash } from "node:crypto";

export const SQL_BACKUP_MANIFEST_VERSION = 1;
export const SQL_BACKUP_PART_SIZE = 1024 * 1024;
export const SQL_BACKUP_PART_MAX_TRANSPORT_SIZE = 2 * 1024 * 1024;
export const SQL_BACKUP_MANIFEST_SEGMENT_PARTS = 500;

export interface SqlBackupManifestPart {
  index: number;
  name: string;
  fileId: string;
  sqlSize: number;
  sqlSha256: string;
  compressedSize: number;
  compressedMd5: string;
}

export interface SqlBackupManifest {
  version: 1;
  format: "salt-peps-sql-parts";
  sqlFileName: string;
  originalSize: number;
  originalSha256: string;
  parts: SqlBackupManifestPart[];
}

export interface SqlBackupManifestSegment {
  version: 1;
  format: "salt-peps-sql-manifest-segment";
  sqlFileName: string;
  index: number;
  parts: SqlBackupManifestPart[];
}

export interface SqlBackupManifestSegmentReference {
  index: number;
  name: string;
  fileId: string;
  size: number;
  sha256: string;
  firstPartIndex: number;
  partCount: number;
}

export interface SqlBackupRootManifest {
  version: 2;
  format: "salt-peps-sql-parts";
  sqlFileName: string;
  originalSize: number;
  originalSha256: string;
  segments: SqlBackupManifestSegmentReference[];
}

export function buildSqlBackupPartName(sqlFileName: string, index: number): string {
  if (!isSafeSqlName(sqlFileName) || !Number.isSafeInteger(index) || index < 1) {
    throw new Error("Invalid SQL backup part name parameters");
  }
  return `${sqlFileName}.part-${String(index).padStart(6, "0")}.gz`;
}

export function buildSqlBackupManifestName(sqlFileName: string): string {
  if (!isSafeSqlName(sqlFileName)) throw new Error("Invalid SQL backup filename");
  return `${sqlFileName}.manifest.json`;
}

export function buildSqlBackupManifestSegmentName(sqlFileName: string, index: number): string {
  if (!isSafeSqlName(sqlFileName) || !Number.isSafeInteger(index) || index < 1) {
    throw new Error("Invalid SQL backup manifest segment name");
  }
  return `${sqlFileName}.manifest-segment-${String(index).padStart(6, "0")}.json`;
}

function isSafeSqlName(name: string): boolean {
  return typeof name === "string" &&
    (name.endsWith(".SQL") || name.endsWith(".sql")) &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !/[\x00\r\n]/.test(name);
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function md5Hex(bytes: Uint8Array): string {
  return createHash("md5").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validDigest(value: unknown, encoding: "sha256" | "md5"): value is string {
  return typeof value === "string" &&
    (encoding === "sha256" ? /^[0-9a-f]{64}$/.test(value) : /^[0-9a-f]{32}$/.test(value));
}

/** Strictly validates manifest shape, expected names and contiguous part metadata. */
export function parseSqlBackupManifest(value: unknown, expectedName?: string): SqlBackupManifest {
  if (!isRecord(value) ||
      value.version !== SQL_BACKUP_MANIFEST_VERSION ||
      value.format !== "salt-peps-sql-parts" ||
      typeof value.sqlFileName !== "string" ||
      !isSafeSqlName(value.sqlFileName) ||
      (expectedName !== undefined && value.sqlFileName !== expectedName) ||
      !Number.isSafeInteger(value.originalSize) ||
      (value.originalSize as number) < 0 ||
      !validDigest(value.originalSha256, "sha256") ||
      !Array.isArray(value.parts)) {
    throw new Error("Invalid SQL backup manifest schema");
  }
  if (Object.keys(value).some((key) =>
    !["version", "format", "sqlFileName", "originalSize", "originalSha256", "parts"].includes(key),
  )) throw new Error("Invalid SQL backup manifest schema");
  const parts = value.parts as unknown[];
  const expectedCount = Math.ceil((value.originalSize as number) / SQL_BACKUP_PART_SIZE);
  if (parts.length !== expectedCount) throw new Error("SQL backup manifest part count mismatch");

  const validated: SqlBackupManifestPart[] = [];
  let totalSize = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!isRecord(part) ||
        part.index !== index + 1 ||
        part.name !== buildSqlBackupPartName(value.sqlFileName, index + 1) ||
        typeof part.fileId !== "string" || part.fileId.length === 0 ||
        !Number.isSafeInteger(part.sqlSize) || (part.sqlSize as number) <= 0 ||
        !validDigest(part.sqlSha256, "sha256") ||
        !Number.isSafeInteger(part.compressedSize) ||
        (part.compressedSize as number) <= 0 ||
        (part.compressedSize as number) > SQL_BACKUP_PART_MAX_TRANSPORT_SIZE ||
        !validDigest(part.compressedMd5, "md5")) {
      throw new Error(`Invalid SQL backup manifest part ${index + 1}`);
    }
    if (Object.keys(part).some((key) =>
      !["index", "name", "fileId", "sqlSize", "sqlSha256", "compressedSize", "compressedMd5"].includes(key),
    )) throw new Error(`Invalid SQL backup manifest part ${index + 1}`);
    const expectedPartSize = Math.min(
      SQL_BACKUP_PART_SIZE,
      (value.originalSize as number) - totalSize,
    );
    if (part.sqlSize !== expectedPartSize) throw new Error(`SQL backup manifest size mismatch at part ${index + 1}`);
    totalSize += part.sqlSize as number;
    validated.push(part as unknown as SqlBackupManifestPart);
  }
  if (totalSize !== value.originalSize) throw new Error("SQL backup manifest total size mismatch");
  if (value.originalSize === 0 && value.originalSha256 !== sha256Hex(new Uint8Array())) {
    throw new Error("Invalid empty SQL backup digest");
  }
  return value as unknown as SqlBackupManifest;
}

export function parseSqlBackupRootManifest(value: unknown, expectedName?: string): SqlBackupRootManifest {
  if (!isRecord(value) ||
      value.version !== 2 ||
      value.format !== "salt-peps-sql-parts" ||
      typeof value.sqlFileName !== "string" ||
      !isSafeSqlName(value.sqlFileName) ||
      (expectedName !== undefined && value.sqlFileName !== expectedName) ||
      !Number.isSafeInteger(value.originalSize) || (value.originalSize as number) < 0 ||
      !validDigest(value.originalSha256, "sha256") ||
      !Array.isArray(value.segments) ||
      Object.keys(value).some(key => !["version", "format", "sqlFileName", "originalSize", "originalSha256", "segments"].includes(key))) {
    throw new Error("Invalid SQL backup root manifest schema");
  }
  const totalParts = Math.ceil((value.originalSize as number) / SQL_BACKUP_PART_SIZE);
  const expectedSegments = Math.ceil(totalParts / SQL_BACKUP_MANIFEST_SEGMENT_PARTS);
  if (value.segments.length !== expectedSegments) throw new Error("SQL backup manifest segment count mismatch");
  let nextPartIndex = 1;
  const segments: SqlBackupManifestSegmentReference[] = [];
  for (let index = 0; index < value.segments.length; index += 1) {
    const segment = value.segments[index];
    const expectedPartCount = Math.min(
      SQL_BACKUP_MANIFEST_SEGMENT_PARTS,
      totalParts - (index * SQL_BACKUP_MANIFEST_SEGMENT_PARTS),
    );
    if (!isRecord(segment) ||
        segment.index !== index + 1 ||
        segment.name !== buildSqlBackupManifestSegmentName(value.sqlFileName, index + 1) ||
        typeof segment.fileId !== "string" || !segment.fileId ||
        !Number.isSafeInteger(segment.size) || (segment.size as number) <= 0 ||
        (segment.size as number) > 1024 * 1024 ||
        !validDigest(segment.sha256, "sha256") ||
        segment.firstPartIndex !== nextPartIndex ||
        segment.partCount !== expectedPartCount ||
        Object.keys(segment).some(key => !["index", "name", "fileId", "size", "sha256", "firstPartIndex", "partCount"].includes(key))) {
      throw new Error(`Invalid SQL backup manifest segment reference ${index + 1}`);
    }
    nextPartIndex += expectedPartCount;
    segments.push(segment as unknown as SqlBackupManifestSegmentReference);
  }
  if (value.originalSize === 0 && value.originalSha256 !== sha256Hex(new Uint8Array())) {
    throw new Error("Invalid empty SQL backup digest");
  }
  return value as unknown as SqlBackupRootManifest;
}

export function parseSqlBackupManifestSegment(
  value: unknown,
  expectedName: string,
  expectedIndex: number,
): SqlBackupManifestSegment {
  if (!isRecord(value) ||
      value.version !== 1 ||
      value.format !== "salt-peps-sql-manifest-segment" ||
      value.sqlFileName !== expectedName ||
      value.index !== expectedIndex ||
      !Array.isArray(value.parts) ||
      Object.keys(value).some(key => !["version", "format", "sqlFileName", "index", "parts"].includes(key))) {
    throw new Error(`Invalid SQL backup manifest segment ${expectedIndex}`);
  }
  const parts = value.parts as unknown[];
  if (parts.length < 1 || parts.length > SQL_BACKUP_MANIFEST_SEGMENT_PARTS) {
    throw new Error(`Invalid SQL backup manifest segment part count ${expectedIndex}`);
  }
  const validated = parts.map((part, offset) => {
    const globalIndex = (expectedIndex - 1) * SQL_BACKUP_MANIFEST_SEGMENT_PARTS + offset + 1;
    if (!isRecord(part) ||
        part.index !== globalIndex ||
        part.name !== buildSqlBackupPartName(expectedName, globalIndex) ||
        typeof part.fileId !== "string" || !part.fileId ||
        !Number.isSafeInteger(part.sqlSize) || (part.sqlSize as number) <= 0 ||
        !validDigest(part.sqlSha256, "sha256") ||
        !Number.isSafeInteger(part.compressedSize) || (part.compressedSize as number) <= 0 ||
        (part.compressedSize as number) > SQL_BACKUP_PART_MAX_TRANSPORT_SIZE ||
        !validDigest(part.compressedMd5, "md5") ||
        Object.keys(part).some(key => !["index", "name", "fileId", "sqlSize", "sqlSha256", "compressedSize", "compressedMd5"].includes(key))) {
      throw new Error(`Invalid SQL backup manifest part ${globalIndex}`);
    }
    return part as unknown as SqlBackupManifestPart;
  });
  return value as unknown as SqlBackupManifestSegment;
}