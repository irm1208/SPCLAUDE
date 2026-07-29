import assert from "node:assert/strict";
import test from "node:test";
import { WORKSPACE_GROUPS } from "./nav.ts";
import {
  WORKSPACE_PAGE_TREATMENT,
  workspaceUsesSharedHeader,
} from "./workspace-theme.ts";

test("every workspace destination has one visual treatment", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id)).sort();
  const themedDestinations = Object.keys(WORKSPACE_PAGE_TREATMENT).sort();

  assert.deepEqual(themedDestinations, destinations);
});

test("workflow-specific screens retain appropriate layouts", () => {
  assert.equal(WORKSPACE_PAGE_TREATMENT.todos, "board");
  assert.equal(WORKSPACE_PAGE_TREATMENT.orders, "table");
  assert.equal(WORKSPACE_PAGE_TREATMENT.broadcast, "composer");
  assert.equal(WORKSPACE_PAGE_TREATMENT.dispatch, "logistics");
  assert.equal(WORKSPACE_PAGE_TREATMENT.pnl, "insight");
  assert.equal(WORKSPACE_PAGE_TREATMENT.tickets, "support");
  assert.equal(WORKSPACE_PAGE_TREATMENT.settings, "configuration");
});

test("only self-headed pages omit the shared page header", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id));
  assert.deepEqual(
    destinations.filter(page => !workspaceUsesSharedHeader(page)).sort(),
    ["members", "orders", "overview"],
  );
});
