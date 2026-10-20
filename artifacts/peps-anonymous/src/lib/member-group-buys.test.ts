import assert from "node:assert/strict";
import test from "node:test";
import { filterMemberGroupBuys, MEMBER_GB_FILTERS } from "./member-group-buys";

const groups = [
  { id: "open", status: "active", archived: false },
  { id: "closed", status: "closed", archived: false },
  { id: "draft", status: "draft", archived: false },
  { id: "completed-open", status: "active", archived: true },
  { id: "completed-closed", status: "closed", archived: true },
];
const ids = (rows: typeof groups) => rows.map(g => g.id);

test("member filters are All, Open, Closed and Completed", () => {
  assert.deepEqual(MEMBER_GB_FILTERS.map(f => f.label), ["All", "Open", "Closed", "Completed"]);
});

test("All includes personally completed groups and drafts", () => {
  assert.deepEqual(filterMemberGroupBuys(groups, "all"), groups);
});

test("Open and Closed exclude personally completed groups", () => {
  assert.deepEqual(ids(filterMemberGroupBuys(groups, "open")), ["open"]);
  assert.deepEqual(ids(filterMemberGroupBuys(groups, "closed")), ["closed"]);
});

test("Completed is personal, independent of shared lifecycle", () => {
  assert.deepEqual(ids(filterMemberGroupBuys(groups, "completed")), ["completed-open", "completed-closed"]);
  assert.deepEqual(filterMemberGroupBuys([{ id: "global", status: "archived", archived: false }], "completed"), []);
});

test("marking and restoring membership changes filters without changing shared status", () => {
  const source = [{ id: "a", status: "closed", archived: false }];
  const completed = source.map(g => ({ ...g, archived: true }));
  assert.equal(filterMemberGroupBuys(completed, "completed").length, 1);
  assert.equal(filterMemberGroupBuys(completed, "closed").length, 0);
  const restored = completed.map(g => ({ ...g, archived: false }));
  assert.deepEqual(restored, source);
  assert.equal(filterMemberGroupBuys(restored, "closed").length, 1);
});
