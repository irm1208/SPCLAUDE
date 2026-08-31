import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Sage AI default model configuration", () => {
  it("uses GPT-5.5 for both the primary and fallback provider defaults", async () => {
    const source = await readFile(new URL("../sage-ai.ts", import.meta.url), "utf8");

    expect(source).toContain('process.env.SAGE_PROXY_MODEL ?? "gpt-5.5"');
    expect(source).toContain('process.env.SAGE_PROXY_FALLBACK_MODEL ?? "gpt-5.5"');
    expect(source).not.toContain('process.env.SAGE_PROXY_MODEL ?? "claude-');
    expect(source).not.toContain('process.env.SAGE_PROXY_FALLBACK_MODEL ?? "claude-');
  });

  it("does not expose Claude models or labels anywhere in Sage settings", async () => {
    const [routeSource, settingsSource] = await Promise.all([
      readFile(new URL("../../routes/admin-sage-settings.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../../peps-anonymous/src/components/AdminSageSettings.tsx", import.meta.url), "utf8"),
    ]);

    const allowlist = routeSource.match(/SAGE_AVAILABLE_MODELS = \[([\s\S]*?)\] as const/)?.[1] ?? "";
    expect(allowlist.toLowerCase()).not.toContain("claude");
    expect(settingsSource).not.toContain('return "Claude"');
    expect(settingsSource).not.toContain('"Claude", "GPT"');
    expect(settingsSource).not.toContain("claude-opus");
  });
});