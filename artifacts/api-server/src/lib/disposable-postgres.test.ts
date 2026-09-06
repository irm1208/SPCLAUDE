import { mkdtemp, mkdir, realpath, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  assertDisposableDataDirectory,
  assertLoopbackPostgresTarget,
  startDisposablePostgres,
} from "./disposable-postgres";

const temporaryPaths: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("assertDisposableDataDirectory", () => {
  test("rejects root, workspace paths, and paths outside its temporary root", async () => {
    const root = await mkdtemp(join(tmpdir(), "sp-backup-verify-test-"));
    temporaryPaths.push(root);

    expect(() => assertDisposableDataDirectory("/", root)).toThrow(/root/i);
    expect(() => assertDisposableDataDirectory(process.cwd(), root)).toThrow(/workspace/i);
    expect(() => assertDisposableDataDirectory(join(tmpdir(), "elsewhere"), root)).toThrow(/temporary root/i);
    expect(() => assertDisposableDataDirectory(join(root, "data"), tmpdir())).toThrow(/temporary root/i);
  });

  test("rejects a data directory that escapes through a symlink", async () => {
    const root = await mkdtemp(join(tmpdir(), "sp-backup-verify-test-"));
    const outside = await mkdtemp(join(tmpdir(), "sp-backup-verify-outside-"));
    temporaryPaths.push(root, outside);
    const escaped = join(root, "escaped");
    await symlink(outside, escaped);

    expect(() => assertDisposableDataDirectory(escaped, root)).toThrow(/symlink|temporary root/i);
  });

  test("rejects an expected root symlink that escapes the approved temporary prefix", async () => {
    const outside = await mkdtemp(join(tmpdir(), "sp-backup-verify-outside-"));
    const linkedRoot = join(tmpdir(), "sp-backup-verify-linked-root");
    temporaryPaths.push(outside, linkedRoot);
    await mkdir(join(outside, "data"), { mode: 0o700 });
    await symlink(outside, linkedRoot);

    expect(() => assertDisposableDataDirectory(join(linkedRoot, "data"), linkedRoot)).toThrow(/root|symlink|approved/i);
  });

  test("accepts a directory inside the resolved temporary root", async () => {
    const root = await mkdtemp(join(tmpdir(), "sp-backup-verify-test-"));
    temporaryPaths.push(root);
    const dataDirectory = join(root, "data");
    await mkdir(dataDirectory, { mode: 0o700 });
    const resolvedRoot = await realpath(root);

    expect(() => assertDisposableDataDirectory(dataDirectory, resolvedRoot)).not.toThrow();
  });
});

describe("assertLoopbackPostgresTarget", () => {
  test.each(["db.example.com", "10.0.0.8", "0.0.0.0", "::1"])("rejects non-IPv4-loopback host %s", (host) => {
    expect(() => assertLoopbackPostgresTarget(host, "restore_verify_safe", "restore_verify_safe")).toThrow(/loopback/i);
  });

  test("rejects a database name other than the generated target", () => {
    expect(() => assertLoopbackPostgresTarget("127.0.0.1", "production", "restore_verify_safe")).toThrow(/database/i);
  });

  test("accepts only the exact generated loopback target", () => {
    expect(() => assertLoopbackPostgresTarget("127.0.0.1", "restore_verify_safe", "restore_verify_safe")).not.toThrow();
  });
});

describe("startDisposablePostgres", () => {
  test(
    "creates a queryable PostgreSQL 16 restore target and removes it idempotently",
    async () => {
      const postgres = await startDisposablePostgres({ timeoutMs: 30_000 });
      temporaryPaths.push(postgres.root);

      try {
        expect(postgres.root).toMatch(/^\/tmp\/sp-backup-verify-/);
        expect(postgres.database).toMatch(/^restore_verify_[a-z0-9_]+$/);
        expect((await stat(postgres.root)).mode & 0o777).toBe(0o700);
        expect(postgres.psqlArgs).not.toContain(process.env.DATABASE_URL);
        expect(postgres.psqlArgs.join(" ")).not.toMatch(/DATABASE_URL/i);
        await expect(postgres.executePsql("SELECT 42")).resolves.toContain("42");
        await expect(postgres.executePsql("SELECT 'DATABASE_URL'")).rejects.toThrow(/DATABASE_URL/i);
        await expect(postgres.executePsql("SHOW data_directory")).resolves.toContain(postgres.dataDirectory);
        await expect(postgres.executePsql("SELECT current_database()")).resolves.toContain(postgres.database);
      } finally {
        await postgres.stopAndRemove();
        await postgres.stopAndRemove();
        expect(resolve(postgres.root)).not.toBe("/");
      }
      await expect(stat(postgres.root)).rejects.toThrow();
    },
    45_000,
  );
});