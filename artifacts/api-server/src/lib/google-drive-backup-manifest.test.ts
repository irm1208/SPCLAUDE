import { describe, expect, it } from "vitest";
import {
  buildSqlBackupManifestName,
  buildSqlBackupPartName,
  parseSqlBackupManifest,
  parseSqlBackupRootManifest,
  SQL_BACKUP_PART_SIZE,
  sha256Hex,
} from "./google-drive-backup-manifest";

const source = Buffer.from("SQL");
const manifest = {
  version: 1,
  format: "salt-peps-sql-parts",
  sqlFileName: "S&PBACKUP-2026-09-02_10-40-11.SQL",
  originalSize: source.length,
  originalSha256: sha256Hex(source),
  parts: [{
    index: 1,
    name: "S&PBACKUP-2026-09-02_10-40-11.SQL.part-000001.gz",
    fileId: "part-id",
    sqlSize: source.length,
    sqlSha256: sha256Hex(source),
    compressedSize: 23,
    compressedMd5: "00000000000000000000000000000000",
  }],
};

describe("versioned SQL backup manifests", () => {
  it("uses scoped, deterministically numbered part and manifest names", () => {
    expect(buildSqlBackupPartName(manifest.sqlFileName, 12))
      .toBe(`${manifest.sqlFileName}.part-000012.gz`);
    expect(buildSqlBackupManifestName(manifest.sqlFileName))
      .toBe(`${manifest.sqlFileName}.manifest.json`);
  });

  it("parses the strict manifest schema and verifies identity", () => {
    expect(parseSqlBackupManifest(manifest, manifest.sqlFileName)).toMatchObject({
      originalSize: source.length,
      parts: [{ index: 1, fileId: "part-id" }],
    });
    expect(() => parseSqlBackupManifest(manifest, "other.SQL")).toThrow(/schema/);
  });

  it.each([
    [{ ...manifest, parts: [] }, /part count/],
    [{ ...manifest, parts: [{ ...manifest.parts[0], index: 2 }] }, /part 1/],
    [{ ...manifest, originalSha256: "bad" }, /schema/],
    [{ ...manifest, parts: [{ ...manifest.parts[0], compressedSize: 2 * 1024 * 1024 + 1 }] }, /part 1/],
  ])("rejects invalid manifests", (invalid, message) => {
    expect(() => parseSqlBackupManifest(invalid)).toThrow(message);
  });

  it("indexes large backups through bounded manifest segments", () => {
    const root = {
      version: 2,
      format: "salt-peps-sql-parts",
      sqlFileName: "S&PBACKUP-2026-09-02_10-40-11.SQL",
      originalSize: 501 * SQL_BACKUP_PART_SIZE,
      originalSha256: sha256Hex(Buffer.from("large backup")),
      segments: [
        {
          index: 1,
          name: "S&PBACKUP-2026-09-02_10-40-11.SQL.manifest-segment-000001.json",
          fileId: "segment-1",
          size: 200_000,
          sha256: sha256Hex(Buffer.from("segment one")),
          firstPartIndex: 1,
          partCount: 500,
        },
        {
          index: 2,
          name: "S&PBACKUP-2026-09-02_10-40-11.SQL.manifest-segment-000002.json",
          fileId: "segment-2",
          size: 500,
          sha256: sha256Hex(Buffer.from("segment two")),
          firstPartIndex: 501,
          partCount: 1,
        },
      ],
    };
    expect(parseSqlBackupRootManifest(root).segments).toHaveLength(2);
    expect(() => parseSqlBackupRootManifest({
      ...root,
      segments: [root.segments[0]],
    })).toThrow(/segment count/);
  });
});