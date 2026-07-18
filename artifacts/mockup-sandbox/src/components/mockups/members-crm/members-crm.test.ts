import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVITY_EVENTS,
  FEATURED_MEMBERS,
  MEMBERS,
  ORDERS,
  type MemberRecord,
} from "./data.ts";
import {
  filterMembers,
  getMemberActivity,
  getMemberOrders,
  sortMembers,
  summarizeMembers,
  type DirectoryFilters,
  type DirectorySortKey,
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
  assert.equal(
    summary.attentionCount,
    MEMBERS.filter((member) => member.attention).length,
  );
  assert.equal(
    summary.confirmedMemberCount,
    MEMBERS.filter((member) => member.paymentStatus === "confirmed").length,
  );
  assert.equal(
    summary.countryCount,
    new Set(MEMBERS.map((member) => member.country)).size,
  );
  assert.ok(MEMBERS.some((member) => member.name === "James Reed"));
  assert.ok(MEMBERS.some((member) => member.attention));

  assert.equal(MEMBERS.length, FEATURED_MEMBERS.length + 36);
});

test("fixture IDs are unique and relationships reference real members", () => {
  const memberIds = new Set(MEMBERS.map((member) => member.id));
  assert.equal(memberIds.size, MEMBERS.length);
  assert.equal(new Set(ORDERS.map((order) => order.id)).size, ORDERS.length);
  assert.equal(
    new Set(ACTIVITY_EVENTS.map((event) => event.id)).size,
    ACTIVITY_EVENTS.length,
  );

  for (const order of ORDERS) {
    assert.ok(memberIds.has(order.memberId));
  }
  for (const event of ACTIVITY_EVENTS) {
    assert.ok(memberIds.has(event.memberId));
  }
});

test("member accounting agrees with related orders and activity", () => {
  for (const member of MEMBERS) {
    const orders = ORDERS.filter((order) => order.memberId === member.id);
    const productQuantity = orders.reduce(
      (total, order) =>
        total +
        order.products.reduce(
          (orderTotal, product) => orderTotal + product.quantity,
          0,
        ),
      0,
    );

    assert.equal(orders.length, member.orderCount);
    assert.equal(
      orders.reduce((total, order) => total + order.total, 0),
      member.totalSpent,
    );
    assert.equal(productQuantity, member.productCount);
    assert.ok(
      ACTIVITY_EVENTS.some((event) => event.memberId === member.id),
    );
  }
});

test("member chronology uses canonical ISO membership dates", () => {
  for (const member of MEMBERS) {
    assert.match(member.memberSince, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("no order predates its member", () => {
  const membersById = new Map(MEMBERS.map((member) => [member.id, member]));

  for (const order of ORDERS) {
    const member = membersById.get(order.memberId);
    assert.ok(member);
    assert.ok(
      order.createdAt >= member.memberSince,
      `${order.id} (${order.createdAt}) predates ${member.id} (${member.memberSince})`,
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
      ["james-reed", "2025-01-01", 5, 11, 1_860, "2026-07-12"],
      ["reeper90", "2025-03-01", 4, 8, 1_240, "2026-07-11"],
      ["maya-chen", "2026-06-01", 3, 6, 980, "2026-07-10"],
      ["noshoes", "2025-02-01", 2, 4, 720, "2026-07-09"],
      ["urban-blend", "2024-11-01", 6, 14, 2_340, "2026-07-08"],
      ["lena-k", "2026-04-01", 3, 7, 1_105, "2026-07-07"],
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

test("member directory filters by country and fulfilment", () => {
  const germany = filterMembers(MEMBERS, {
    ...DEFAULT_FILTERS,
    country: "Germany",
  });
  const blocked = filterMembers(MEMBERS, {
    ...DEFAULT_FILTERS,
    fulfilment: "blocked",
  });

  assert.ok(germany.length > 0);
  assert.ok(germany.every((member) => member.country === "Germany"));
  assert.ok(blocked.length > 0);
  assert.ok(
    blocked.every((member) => member.fulfilmentStatus === "blocked"),
  );
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

test("member directory sorts every key in both directions", () => {
  const fixtures: MemberRecord[] = [
    {
      ...MEMBERS[0],
      id: "sort-charlie",
      name: "Charlie",
      orderCount: 2,
      totalSpent: 300,
      lastOrderAt: "2026-03-01",
    },
    {
      ...MEMBERS[1],
      id: "sort-alpha",
      name: "Alpha",
      orderCount: 4,
      totalSpent: 100,
      lastOrderAt: "2026-02-01",
    },
    {
      ...MEMBERS[2],
      id: "sort-bravo",
      name: "Bravo",
      orderCount: 1,
      totalSpent: 400,
      lastOrderAt: "2026-01-01",
    },
  ];
  const cases: Array<{
    key: DirectorySortKey;
    asc: string[];
    desc: string[];
  }> = [
    {
      key: "name",
      asc: ["sort-alpha", "sort-bravo", "sort-charlie"],
      desc: ["sort-charlie", "sort-bravo", "sort-alpha"],
    },
    {
      key: "orders",
      asc: ["sort-bravo", "sort-charlie", "sort-alpha"],
      desc: ["sort-alpha", "sort-charlie", "sort-bravo"],
    },
    {
      key: "totalSpent",
      asc: ["sort-alpha", "sort-charlie", "sort-bravo"],
      desc: ["sort-bravo", "sort-charlie", "sort-alpha"],
    },
    {
      key: "lastOrderAt",
      asc: ["sort-bravo", "sort-alpha", "sort-charlie"],
      desc: ["sort-charlie", "sort-alpha", "sort-bravo"],
    },
  ];

  for (const sortCase of cases) {
    assert.deepEqual(
      sortMembers(fixtures, sortCase.key, "asc").map((member) => member.id),
      sortCase.asc,
    );
    assert.deepEqual(
      sortMembers(fixtures, sortCase.key, "desc").map((member) => member.id),
      sortCase.desc,
    );
  }
});

test("member directory keeps null order dates last in both directions", () => {
  const fixtures: MemberRecord[] = [
    {
      ...MEMBERS[0],
      id: "undated-member",
      lastOrderAt: null,
    },
    {
      ...MEMBERS[1],
      id: "dated-member",
      lastOrderAt: "2026-01-01",
    },
  ];

  for (const direction of ["asc", "desc"] as const) {
    assert.deepEqual(
      sortMembers(fixtures, "lastOrderAt", direction).map(
        (member) => member.id,
      ),
      ["dated-member", "undated-member"],
    );
  }
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
