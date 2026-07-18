import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVITY_EVENTS,
  FEATURED_MEMBERS,
  MEMBERS,
  ORDERS,
} from "./data.ts";
import {
  filterMembers,
  getMemberActivity,
  getMemberOrders,
  sortMembers,
  summarizeMembers,
  type DirectoryFilters,
} from "./members-crm-model.ts";

const source = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

const DEFAULT_FILTERS: DirectoryFilters = {
  query: "",
  country: "all",
  payment: "all",
  fulfilment: "all",
  sortKey: "name",
  direction: "asc",
};

test("member fixtures and summary totals stay consistent", () => {
  const summary = summarizeMembers(MEMBERS, ORDERS);
  const expectedTotalSpent = MEMBERS.reduce(
    (total, member) => total + member.totalSpent,
    0,
  );

  assert.equal(summary.memberCount, MEMBERS.length);
  assert.equal(summary.orderCount, ORDERS.length);
  assert.equal(summary.totalSpent, expectedTotalSpent);
  assert.ok(MEMBERS.some((member) => member.name === "James Reed"));
  assert.ok(MEMBERS.some((member) => member.attention));

  assert.equal(MEMBERS.length, FEATURED_MEMBERS.length + 36);
  const memberIds = new Set(MEMBERS.map((member) => member.id));
  for (const order of ORDERS) {
    assert.ok(memberIds.has(order.memberId));
  }
  for (const member of MEMBERS) {
    assert.equal(
      ORDERS.filter((order) => order.memberId === member.id).length,
      member.orderCount,
    );
    assert.ok(
      ACTIVITY_EVENTS.some((event) => event.memberId === member.id),
    );
  }
});

test("featured member records match the approved CRM fixture", () => {
  assert.deepEqual(
    FEATURED_MEMBERS.map((member) => [
      member.id,
      member.memberSince,
      member.orderCount,
      member.productCount,
      member.totalSpent,
      member.lastOrderAt,
    ]),
    [
      ["james-reed", "Jan 2025", 5, 11, 1_860, "2026-07-12"],
      ["reeper90", "Mar 2025", 4, 8, 1_240, "2026-07-11"],
      ["maya-chen", "Jun 2026", 3, 6, 980, "2026-07-10"],
      ["noshoes", "Feb 2025", 2, 4, 720, "2026-07-09"],
      ["urban-blend", "Nov 2024", 6, 14, 2_340, "2026-07-08"],
      ["lena-k", "Apr 2026", 3, 7, 1_105, "2026-07-07"],
    ],
  );
});

test("member directory query matches reeper90 exactly", () => {
  const matches = filterMembers(MEMBERS, {
    ...DEFAULT_FILTERS,
    query: "  reeper90  ",
  });

  assert.deepEqual(
    matches.map((member) => member.username),
    ["@reeper90"],
  );
});

test("member directory payment filter returns only pending members", () => {
  const pending = filterMembers(MEMBERS, {
    ...DEFAULT_FILTERS,
    payment: "pending",
  });

  assert.ok(pending.length > 0);
  assert.ok(pending.every((member) => member.paymentStatus === "pending"));
});

test("member directory sort returns descending spend without mutation", () => {
  const input = MEMBERS.slice(0, 12);
  const originalIds = input.map((member) => member.id);
  const sorted = sortMembers(input, "totalSpent", "desc");

  assert.notStrictEqual(sorted, input);
  assert.deepEqual(
    sorted.map((member) => member.totalSpent),
    [...input]
      .sort((left, right) => right.totalSpent - left.totalSpent)
      .map((member) => member.totalSpent),
  );
  assert.deepEqual(
    input.map((member) => member.id),
    originalIds,
  );
});

test("James Reed resolves related orders and activity", () => {
  const james = MEMBERS.find((member) => member.name === "James Reed");
  assert.ok(james);

  const orders = getMemberOrders(ORDERS, james.id);
  const activity = getMemberActivity(james.id);

  assert.ok(orders.length > 0);
  assert.ok(activity.length > 0);
  assert.ok(orders.every((order) => order.memberId === james.id));
  assert.ok(activity.every((event) => event.memberId === james.id));
});

test("member CRM shell carries campaign styling and reduced motion", () => {
  const shell = source("./MembersCrmShell.tsx");
  const styles = source("./_group.css");

  assert.match(shell, /Winter Peptide Run 2025/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /#1B3A7A/);
  assert.match(styles, /#2D6BCC/);
});

test("member directory exposes search, sort, and selection semantics", () => {
  const directory = source("./MemberCrmDirectory.tsx");

  assert.match(directory, /aria-label="Search members"/);
  assert.match(directory, /aria-sort/);
  assert.match(directory, /aria-selected/);
});

test("member profile and activity timeline expose empty and time semantics", () => {
  const profile = source("./MemberCrmProfile.tsx");
  const timeline = source("./MemberActivityTimeline.tsx");

  assert.match(profile, /SheetContent/);
  assert.match(profile, /Choose a member/);
  assert.match(timeline, /Activity/);
  assert.match(timeline, /dateTime/);
});

test("member CRM entry composes the approved workspace regions", () => {
  const entry = source("./MembersCrmMockup.tsx");

  assert.match(entry, /MembersCrmShell/);
  assert.match(entry, /MemberCrmSummary/);
  assert.match(entry, /MemberCrmDirectory/);
  assert.match(entry, /MemberCrmProfile/);
  assert.match(entry, /MemberActivityTimeline/);
});
