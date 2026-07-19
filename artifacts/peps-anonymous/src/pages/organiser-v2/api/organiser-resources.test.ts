import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("dispatch tab uses the authenticated organiser dispatch API", () => {
  const tab = read("../DispatchTab.tsx");
  const workspace = read("../Workspace.tsx");

  assert.match(tab, /DispatchManager/);
  assert.match(tab, /base:\s*"\/organiser\/dispatch"/);
  assert.match(tab, /credentials:\s*"include"/);
  assert.match(tab, /gbId:\s*selectedGbId/);
  assert.match(workspace, /<DispatchTab selectedGbId=\{gb\.id\}/);
  assert.doesNotMatch(workspace, /createInitialDeskState/);
});

test("workspace routes operational tabs through the established live organiser API implementations", () => {
  const workspace = read("../Workspace.tsx");
  const established = read("../../GbOrganiser.tsx");

  for (const component of [
    "ShippingPayTab",
    "ParcelsTab",
    "LabTestsTabOrg",
    "PnlTab",
    "SummaryTab",
    "BroadcastTab",
    "OrganiserReshippersTab",
    "OrganiserCountryLegsTab",
    "OrganiserRulesTab",
    "OrgTicketsTab",
  ]) {
    assert.match(established, new RegExp(`export function ${component}`));
    assert.match(workspace, new RegExp(`Live${component}`));
  }

  assert.match(workspace, /apiGroupBuy:\s*OrganiserGB/);
  assert.match(workspace, /import GbProductsTab from "\.\/GbProductsTab"/);
  assert.match(workspace, /<GbProductsTab[\s\S]*?selectedGbId=\{gb\.id\}/);
  assert.match(workspace, /<LiveOrgTicketsTab gb=\{apiGroupBuy\}/);
});

test("settings tab reads and writes the selected group buy through the API", () => {
  const settings = read("../GbSettingsTab.tsx");
  const api = read("./organiser-api.ts");

  assert.doesNotMatch(settings, /loadGb|saveGb|simulateSave/);
  assert.match(settings, /organiserApi\.groupBuy/);
  assert.match(settings, /organiserApi\.updateGroupBuy/);
  assert.match(settings, /organiserApi\.archiveGroupBuy/);
  assert.match(api, /updateGroupBuy:/);
  assert.match(api, /archiveGroupBuy:/);
});

test("todos are persisted by authenticated organiser endpoints", () => {
  const todo = read("../TodoTab.tsx");
  const api = read("./organiser-api.ts");
  const routes = read("../../../../../api-server/src/routes/index.ts");
  const schema = read("../../../../../../lib/db/src/schema/index.ts");

  assert.doesNotMatch(todo, /loadGb|saveGb|SAMPLE_TODOS/);
  assert.match(todo, /organiserApi\.todos/);
  assert.match(todo, /organiserApi\.createTodo/);
  assert.match(todo, /organiserApi\.updateTodo/);
  assert.match(todo, /organiserApi\.deleteTodo/);
  assert.match(api, /todos:/);
  assert.match(routes, /organiserTodosRouter/);
  assert.match(schema, /organiser_todos/);
});

test("remaining replacement surfaces use live organiser resources", () => {
  const setup = read("../SetupWizard.tsx");
  const testing = read("../TestingGroupsTab.tsx");
  const search = read("../GlobalSearch.tsx");
  const members = read("../MembersTab.tsx");
  const workspace = read("../Workspace.tsx");
  const testingRoute = read("../../../../../api-server/src/routes/organiser-testing.ts");
  const routes = read("../../../../../api-server/src/routes/index.ts");

  assert.match(setup, /organiserApi\.createGroupBuy/);
  assert.match(setup, /organiserApi\.updateGroupBuy/);
  assert.doesNotMatch(setup, /v2:setup:draftSavedAt|v2:hasCreatedGb/);
  assert.match(testing, /organiserApi\.testingPool/);
  assert.doesNotMatch(testing, /SAMPLE_(GROUPS|LAB_TESTS|PRODUCTS)|setTimeout/);
  assert.match(search, /organiserApi\.tickets/);
  assert.match(search, /organiserApi\.todos/);
  assert.match(search, /organiserApi\.members/);
  assert.doesNotMatch(search, /loadGb/);
  assert.match(members, /organiserApi\.members/);
  assert.match(workspace, /organiserApi\.tickets/);
  assert.match(workspace, /organiserApi\.testingPool/);
  assert.match(testingRoute, /requireOrganiser/);
  assert.match(testingRoute, /\/organiser\/group-buys\/:gbId\/testing/);
  assert.match(routes, /organiserTestingRouter/);
});
