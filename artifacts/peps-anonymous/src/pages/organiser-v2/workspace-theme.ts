import type { WorkspaceTabId } from "./nav";

export type WorkspacePageTreatment =
  | "dashboard"
  | "board"
  | "table"
  | "composer"
  | "logistics"
  | "insight"
  | "support"
  | "configuration";

export const WORKSPACE_PAGE_TREATMENT = {
  overview: "dashboard",
  todos: "board",
  members: "table",
  orders: "table",
  broadcast: "composer",
  parcels: "logistics",
  dispatch: "logistics",
  qrcodes: "logistics",
  reshippers: "logistics",
  legs: "logistics",
  shipping: "logistics",
  "shipping-split": "logistics",
  pnl: "insight",
  labtests: "insight",
  testinggroups: "insight",
  summary: "insight",
  tickets: "support",
  settings: "configuration",
  products: "configuration",
  rules: "configuration",
} as const satisfies Record<WorkspaceTabId, WorkspacePageTreatment>;

const SELF_HEADED_PAGES = new Set<WorkspaceTabId>([
  "overview",
  "orders",
  "members",
]);

export function workspaceUsesSharedHeader(pageId: WorkspaceTabId): boolean {
  return !SELF_HEADED_PAGES.has(pageId);
}
