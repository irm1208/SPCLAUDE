import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

test("writes discovered mockup modules in alphabetical path order", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-registry-"));

  try {
    const mockups = path.join(root, "src/components/mockups");
    // Make the directories in non-alphabetical order to reproduce filesystem-order discovery.
    await mkdir(path.join(mockups, "zeta"), { recursive: true });
    await mkdir(path.join(mockups, "alpha"), { recursive: true });
    await mkdir(path.join(mockups, "middle"), { recursive: true });
    await Promise.all([
      writeFile(path.join(mockups, "zeta/Z.tsx"), "export default null;"),
      writeFile(path.join(mockups, "alpha/A.tsx"), "export default null;"),
      writeFile(path.join(mockups, "middle/M.tsx"), "export default null;"),
    ]);

    const plugin = mockupPreviewPlugin();
    const resolveConfig = plugin.configResolved as (config: { root: string }) => void;
    const buildStart = plugin.buildStart as () => Promise<void>;
    resolveConfig({ root });
    await buildStart();

    const generated = await readFile(
      path.join(root, "src/.generated/mockup-components.ts"),
      "utf8",
    );
    const paths = [...generated.matchAll(/"(\.\/components\/mockups\/[^"]+)":/g)]
      .map((match) => match[1]);

    assert.deepEqual(paths, [...paths].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});