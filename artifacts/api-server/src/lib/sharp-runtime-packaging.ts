import path from "node:path";
import { cp, mkdir, readdir, realpath } from "node:fs/promises";
import { createRequire } from "node:module";

/**
 * Include sharp's installed platform binaries alongside the standalone API
 * bundle. sharp's JS is bundled by esbuild; these packages contain its native
 * .node binding and (on Linux) libvips shared library.
 */
export async function copySharpRuntimePackages(apiServerDir: string, distDir: string): Promise<void> {
  const sharpPackageDir = await realpath(path.join(apiServerDir, "node_modules/sharp"));
  const installedImgDir = path.resolve(sharpPackageDir, "../@img");
  // Keep this outside any node_modules path: .replitignore excludes those
  // directories from deployments, including ones produced during the build.
  const outputImgDir = path.join(distDir, "vendor/@img");
  const packageEntries = await readdir(installedImgDir, { withFileTypes: true });
  const sharpRequire = createRequire(path.join(sharpPackageDir, "package.json"));
  const libcFamily = process.platform === "linux"
    ? (sharpRequire("detect-libc") as { familySync: () => string | null }).familySync()
    : null;
  const runtimePlatform = `${process.platform}${libcFamily === "musl" ? "musl" : ""}-${process.arch}`;
  const requiredNames = [`sharp-${runtimePlatform}`];
  if (!runtimePlatform.endsWith("wasm32")) requiredNames.push(`sharp-libvips-${runtimePlatform}`);
  const availableNames = new Set(
    packageEntries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name),
  );
  const missingNames = requiredNames.filter((name) => !availableNames.has(name));

  if (missingNames.length > 0) {
    throw new Error(`Missing sharp runtime package(s) for ${runtimePlatform}: ${missingNames.join(", ")}`);
  }

  await mkdir(outputImgDir, { recursive: true });
  await Promise.all(
    requiredNames.map((name) =>
      cp(
        path.join(installedImgDir, name),
        path.join(outputImgDir, name),
        { recursive: true, dereference: true },
      ),
    ),
  );
}