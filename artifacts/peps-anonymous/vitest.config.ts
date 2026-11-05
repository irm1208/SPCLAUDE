import { defineConfig, mergeConfig } from "vitest/config";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import viteConfig from "./vite.config";

// This package has two kinds of test files side by side: Vitest suites and
// node:test suites (run with `node --test` / `tsx --test` from package.json
// scripts). They share the *.test.ts(x) naming, so Vitest used to pick up the
// node:test files and report "No test suite found" for each of them (160
// files). Exclude anything that imports node:test, found by reading the file.
function nodeTestFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== "node_modules") nodeTestFiles(full, out); continue; }
    if (!/\.(test|spec)\.(ts|tsx|mjs|js)$/.test(entry)) continue;
    const head = readFileSync(full, "utf8").slice(0, 4000);
    if (/from\s+["']node:test["']|require\(["']node:test["']\)/.test(head)) out.push(relative(__dirname, full).replace(/\\/g, "/"));
  }
  return out;
}

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}", "*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ...nodeTestFiles(join(__dirname, "src"))],
  },
}));
