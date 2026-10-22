import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOrganiserFullName } from "./shared-organiser-name";

describe("self-declared organiser full names", () => {
  it.each([
    [" Jane   Smith ", "Jane Smith"], ["Jean-Luc O’Neill", "Jean-Luc O’Neill"],
    ["José García", "José García"], ["李 小明", "李 小明"], ["Anne Marie Smith", "Anne Marie Smith"],
  ])("accepts and normalises %s", (input, expected) => {
    expect(parseOrganiserFullName(input)).toBe(expected);
  });
  it.each([undefined, null, {}, 123, "", " ", "@username", "username4711", "Jane", "Jane Smith 123", "Jane .", "A".repeat(101) + " Smith"])(
    "rejects missing names, handles, numbers, and oversized input (%s)", input => {
      expect(parseOrganiserFullName(input)).toBeNull();
    },
  );
});

describe("shared-order organiser full name wiring", () => {
  const source = readFileSync(new URL("../routes/wholesale-shares.ts", import.meta.url), "utf8");
  it("validates the name before creating a share and persists it separately from the username", () => {
    const create = source.slice(source.indexOf('router.post("/wholesale-shares",'), source.indexOf('router.get("/wholesale-shares/:id"'));
    expect(create.includes("parseOrganiserFullName(body.organiserFullName)")).toBe(true);
    expect(create.indexOf("parseOrganiserFullName(body.organiserFullName)")).toBeLessThan(create.indexOf("getActiveWholesaleVendor()"));
    expect(create.includes("creatorUsername: me,")).toBe(true);
    expect(create.includes("organiserFullName,")).toBe(true);
  });
  it("does not expose the real name to other shared-order participants", () => {
    expect(source.includes("organiserFullName: isCreatorViewer ? (share.organiserFullName ?? null) : null")).toBe(true);
  });
  it("connects the required creation input and existing organiser settings", () => {
    const entry = readFileSync(new URL("../../../peps-anonymous/src/pages/WholesaleShareEntry.tsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../../../peps-anonymous/src/pages/WholesaleShared.tsx", import.meta.url), "utf8");
    expect(entry.includes('createWholesaleShare("even", organiserFullName)')).toBe(true);
    expect(entry.includes('autoComplete="name"')).toBe(true);
    expect(detail.includes("organiserFullName: settingsForm.organiserFullName")).toBe(true);
  });
});
