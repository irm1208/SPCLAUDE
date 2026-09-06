import { realpathSync } from "node:fs";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createServer } from "node:net";
import { ChildProcess, execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const execFileAsync = promisify(execFile);
const TEMPORARY_PREFIX = "sp-backup-verify-";
const DEFAULT_TIMEOUT_MS = 30_000;
const CLUSTER_OWNER = "restore_verify_owner";

export interface DisposablePostgres {
  readonly root: string;
  readonly dataDirectory: string;
  readonly socketDirectory: string;
  readonly port: number;
  readonly database: string;
  /** Fixed connection arguments generated for this disposable target. */
  readonly psqlArgs: readonly string[];
  restoreSql(source: Readable): Promise<void>;
  executePsql(sql: string): Promise<string>;
  stopAndRemove(): Promise<void>;
}

function isInside(path: string, root: string): boolean {
  const pathRelative = relative(root, path);
  return pathRelative !== "" && !pathRelative.startsWith(`..${sep}`) && pathRelative !== ".." && !pathRelative.startsWith(sep);
}

function commandEnvironment(): NodeJS.ProcessEnv {
  const allowedKeys = ["PATH", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TMP", "TEMP"] as const;
  return Object.fromEntries(allowedKeys.flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
}

function assertSafeCommandArguments(arguments_: readonly string[]): void {
  if (arguments_.some((argument) => /DATABASE_URL/i.test(argument))) {
    throw new Error("Disposable PostgreSQL commands must not contain DATABASE_URL");
  }
}

async function runCommand(
  command: string,
  arguments_: readonly string[],
  timeoutMs: number,
  extraEnvironment: NodeJS.ProcessEnv = {},
): Promise<string> {
  assertSafeCommandArguments(arguments_);
  const { stdout } = await execFileAsync(command, [...arguments_], {
    env: { ...commandEnvironment(), ...extraEnvironment },
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

async function reserveLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  await new Promise<void>((resolvePromise, reject) => server.close((error) => (error ? reject(error) : resolvePromise())));
  if (address === null || typeof address === "string") {
    throw new Error("Could not reserve a loopback PostgreSQL port");
  }
  return address.port;
}

async function waitForChildExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error(`Disposable PostgreSQL did not exit within ${timeoutMs}ms`));
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolvePromise();
    };
    child.once("exit", onExit);
  });
}

async function terminateChild(child: ChildProcess, dataDirectory: string, timeoutMs: number): Promise<void> {
  try {
    await runCommand("pg_ctl", ["-D", dataDirectory, "-m", "fast", "stop", "-w", "-t", String(Math.max(1, Math.ceil(timeoutMs / 1000)))], timeoutMs);
  } catch {
    // The child is still verified below; pg_ctl failure must never imply safe removal.
  }
  try {
    await waitForChildExit(child, timeoutMs);
    return;
  } catch {
    if (child.pid !== undefined) process.kill(-child.pid, "SIGTERM");
  }
  try {
    await waitForChildExit(child, timeoutMs);
    return;
  } catch {
    if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
  }
  await waitForChildExit(child, timeoutMs);
}

async function waitUntilReady(socketDirectory: string, port: number, dataDirectory: string, timeoutMs: number, exited: () => boolean): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (exited()) {
      throw new Error("Disposable PostgreSQL exited before its private socket became ready");
    }
    try {
      await runCommand("pg_isready", ["-h", socketDirectory, "-p", String(port), "-d", "postgres"], 2_000);
      const reportedDataDirectory = (await runCommand(
        "psql",
        ["-h", socketDirectory, "-p", String(port), "-U", CLUSTER_OWNER, "-d", "postgres", "-Atq", "-c", "SHOW data_directory"],
        2_000,
      )).trim();
      if (reportedDataDirectory !== dataDirectory) {
        throw new Error("Private PostgreSQL socket reported an unexpected data directory");
      }
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
  }
  throw new Error(`Disposable PostgreSQL private socket did not become ready within ${timeoutMs}ms: ${String(lastError)}`);
}

export function assertDisposableDataDirectory(path: string, expectedRoot: string): void {
  const resolvedPath = resolve(path);
  const resolvedExpectedRoot = resolve(expectedRoot);
  const workspaceRoot = "/home/runner/workspace";

  if (resolvedPath === sep) {
    throw new Error("Refusing to use filesystem root as a disposable PostgreSQL data directory");
  }
  if (resolvedPath === workspaceRoot || resolvedPath.startsWith(`${workspaceRoot}${sep}`) || resolvedPath === process.cwd() || resolvedPath.startsWith(`${process.cwd()}${sep}`)) {
    throw new Error("Refusing to use a workspace path as a disposable PostgreSQL data directory");
  }
  if (!isInside(resolvedPath, resolvedExpectedRoot)) {
    throw new Error("Disposable PostgreSQL data directory must be inside its temporary root");
  }
  const realRoot = realpathSync(resolvedExpectedRoot);
  if (
    resolvedExpectedRoot !== realRoot ||
    dirname(realRoot) !== resolve(tmpdir()) ||
    !basename(realRoot).startsWith(TEMPORARY_PREFIX)
  ) {
    throw new Error("Disposable PostgreSQL temporary root is not an approved temporary root");
  }

  const realPath = realpathSync(resolvedPath);
  if (!isInside(realPath, realRoot)) {
    throw new Error("Disposable PostgreSQL data directory symlink escapes its temporary root");
  }
}

export function assertLoopbackPostgresTarget(host: string, database: string, expectedDatabase: string): void {
  if (host !== "127.0.0.1") {
    throw new Error("Disposable PostgreSQL target must use the 127.0.0.1 loopback host");
  }
  if (database !== expectedDatabase) {
    throw new Error("Disposable PostgreSQL target database does not match the generated database");
  }
}

export async function startDisposablePostgres(options: { timeoutMs?: number } = {}): Promise<DisposablePostgres> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Disposable PostgreSQL timeout must be positive");
  }

  const root = await mkdtemp(join(tmpdir(), TEMPORARY_PREFIX));
  await chmod(root, 0o700);
  const resolvedRoot = realpathSync(root);
  const dataDirectory = join(resolvedRoot, "data");
  const socketDirectory = join(resolvedRoot, "socket");
  const database = `restore_verify_${randomBytes(10).toString("hex")}`;
  const restoreRole = `restore_verify_role_${randomBytes(10).toString("hex")}`;
  const restorePassword = randomBytes(32).toString("base64url");
  let childProcess: ChildProcess | undefined;
  let removed = false;

  const stopAndRemove = async (): Promise<void> => {
    if (removed) return;
    if (childProcess) await terminateChild(childProcess, dataDirectory, timeoutMs);
    assertDisposableDataDirectory(dataDirectory, resolvedRoot);
    await rm(resolvedRoot, { recursive: true, force: true });
    removed = true;
  };

  try {
    await mkdir(dataDirectory, { mode: 0o700 });
    await mkdir(socketDirectory, { mode: 0o700 });
    assertDisposableDataDirectory(dataDirectory, resolvedRoot);
    await runCommand("initdb", ["-D", dataDirectory, "--auth=trust", "--no-locale", "--encoding=UTF8", `--username=${CLUSTER_OWNER}`], timeoutMs);
    await writeFile(
      join(dataDirectory, "pg_hba.conf"),
      [
        `local all ${CLUSTER_OWNER} trust`,
        "local all all reject",
        `host ${database} ${restoreRole} 127.0.0.1/32 scram-sha-256`,
        "host all all 127.0.0.1/32 reject",
        "host all all ::1/128 reject",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    let port = 0;
    let startupError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      port = await reserveLoopbackPort();
      const startupArgs = ["-D", dataDirectory, "-h", "127.0.0.1", "-p", String(port), "-k", socketDirectory];
      assertSafeCommandArguments(startupArgs);
      const child = spawn("postgres", startupArgs, { detached: true, stdio: "ignore", env: commandEnvironment() });
      childProcess = child;
      let exited = false;
      child.once("exit", () => { exited = true; });
      child.once("error", () => { exited = true; });
      try {
        await waitUntilReady(socketDirectory, port, dataDirectory, timeoutMs, () => exited);
        startupError = undefined;
        break;
      } catch (error) {
        startupError = error;
        if (!exited || attempt === 2) throw error;
      }
    }
    if (startupError) throw startupError;

    assertLoopbackPostgresTarget("127.0.0.1", database, database);
    const bootstrapSql = join(resolvedRoot, "bootstrap-role.sql");
    await writeFile(
      bootstrapSql,
      `SET password_encryption = 'scram-sha-256';\nCREATE ROLE ${restoreRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${restorePassword}';\n`,
      { mode: 0o600 },
    );
    try {
      await runCommand(
        "psql",
        ["-h", socketDirectory, "-p", String(port), "-U", CLUSTER_OWNER, "-d", "postgres", "-Atq", "-f", bootstrapSql],
        timeoutMs,
      );
    } finally {
      await rm(bootstrapSql, { force: true });
    }
    await runCommand("createdb", ["-h", socketDirectory, "-p", String(port), "-U", CLUSTER_OWNER, "-O", restoreRole, database], timeoutMs);
    const psqlArgs = Object.freeze(["-h", "127.0.0.1", "-p", String(port), "-U", restoreRole, "-d", database, "-Atq"]);
    const restoreSql = async (source: Readable): Promise<void> => {
      const arguments_ = ["-X", "--set", "ON_ERROR_STOP=1", ...psqlArgs];
      assertSafeCommandArguments(arguments_);
      const child = spawn("psql", arguments_, {
        stdio: ["pipe", "ignore", "ignore"],
        env: { ...commandEnvironment(), PGPASSWORD: restorePassword },
      });
      if (!child.stdin) throw new Error("psql did not provide stdin");
      const exited = new Promise<void>((resolvePromise, reject) => {
        child.once("error", reject);
        child.once("close", code => code === 0 ? resolvePromise() : reject(new Error("psql restore failed")));
      });
      try {
        await Promise.all([pipeline(source, child.stdin), exited]);
      } catch (error) {
        child.kill("SIGTERM");
        throw error;
      }
    };

    return {
      root: resolvedRoot,
      dataDirectory,
      socketDirectory,
      port,
      database,
      psqlArgs,
      restoreSql,
      executePsql: async (sql: string) => runCommand("psql", [...psqlArgs, "-c", sql], timeoutMs, { PGPASSWORD: restorePassword }),
      stopAndRemove,
    };
  } catch (error) {
    await stopAndRemove();
    throw error;
  }
}