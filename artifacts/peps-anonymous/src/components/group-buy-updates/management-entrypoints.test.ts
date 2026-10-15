import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("Admin group-buy settings expose a status section for the selected group", () => {
  const source = read("../admin/group-buys/panels/DetailsPanel.tsx");
  assert.match(source, /id: "progress" as const, label: "Status & updates"/);
  assert.match(source, /detailsSubTab === "progress" && <GroupBuyUpdatesManager key=\{gb.id\} scope="admin" groupBuyId=\{gb.id\}/);
});
test("Organiser V2 has a dedicated status section scoped to its selected group", () => {
  const source = read("../../pages/organiser-v2/GbSettingsTab.tsx");
  assert.match(source, /id: "progress",\s*label: "Status & updates"/);
  assert.match(source, /selectedGbId && activeSection === "progress"/);
  assert.match(source, /scope="organiser" groupBuyId=\{selectedGbId\}/);
});
test("original organiser retains the status selector in Edit GB settings", () => {
  const source = read("../../pages/GbOrganiser.tsx");
  assert.match(source, /!isNew && gb.id && detailsTab === "settings"/);
  assert.match(source, /<GroupBuyUpdatesManager key=\{gb.id\} scope="organiser" groupBuyId=\{gb.id\}/);
});
test("the shared selector clearly labels status and retains server-backed saving", () => {
  const source = read("./GroupBuyUpdatesManager.tsx");
  assert.match(source, />Group buy status</);
  assert.match(source, /Save status/);
  assert.match(source, /GB_STAGES.map/);
  assert.match(source, /saveStage\(scope, groupBuyId, stage, expected\)/);
});
