import {
  LayoutDashboard, ShoppingBag, ClipboardList, SendHorizonal,
  Truck, FileText, QrCode, Users, Globe, Settings, Package, Shield,
  BarChart3, FileCheck, MessageSquare, ListTodo, UserRound,
  type LucideIcon,
} from "lucide-react";

// ─── Workspace navigation ────────────────────────────────────────────────────
// The old 19 flat tabs, regrouped people-first: daily essentials pinned at the
// top (no header), then everything member-facing together, money with orders,
// the shipping pipeline intact, and quality/setup at the rear. Setup/Access
// live in the guided wizard, so the day-to-day workspace only needs the
// running-a-GB areas.

export type WorkspaceTabId =
  | "overview"
  | "members"
  | "orders" | "broadcast"
  | "parcels" | "dispatch" | "qrcodes" | "reshippers" | "legs" | "shipping"
  | "pnl" | "labtests" | "testinggroups" | "tickets" | "todos"
  | "settings" | "products" | "rules" | "summary";

export interface WorkspaceTab {
  id: WorkspaceTabId;
  label: string;
  icon: LucideIcon;
  description?: string; // Optional tooltip for beginners
}

export interface WorkspaceGroup {
  id: string;
  label: string;
  tabs: WorkspaceTab[];
}

export const MOBILE_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "dispatch", label: "Dispatch", icon: FileText },
  { id: "members", label: "Members", icon: UserRound },
] as const satisfies ReadonlyArray<Pick<WorkspaceTab, "id" | "label" | "icon">>;

export const WORKSPACE_GROUPS: WorkspaceGroup[] = [
  {
    id: "pinned",
    label: "", // no header — daily essentials pinned at the top
    tabs: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, description: "Dashboard with stats and recent activity" },
      { id: "todos", label: "Tasks", icon: ListTodo, description: "Your personal task list" },
    ],
  },
  {
    id: "people",
    label: "People",
    tabs: [
      { id: "members", label: "Members", icon: UserRound, description: "Member orders, payments, and fulfilment" },
      { id: "tickets", label: "Tickets", icon: MessageSquare, description: "Member support conversations" },
      { id: "broadcast", label: "Announcements", icon: SendHorizonal, description: "Send updates to all members" },
    ],
  },
  {
    id: "orders-money",
    label: "Orders & money",
    tabs: [
      { id: "orders", label: "Orders", icon: ShoppingBag, description: "View and manage member orders" },
      { id: "summary", label: "Supplier Summary", icon: ClipboardList, description: "Export order rollup for suppliers" },
      { id: "pnl", label: "Profit & Loss", icon: BarChart3, description: "Revenue and costs breakdown" },
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    tabs: [
      { id: "parcels", label: "Incoming Parcels", icon: Truck, description: "Track packages from supplier" },
      { id: "dispatch", label: "Dispatch", icon: FileText, description: "Assign products to orders and print labels" },
      { id: "qrcodes", label: "Shipping Labels", icon: QrCode, description: "Member shipping labels and QR status" },
      { id: "reshippers", label: "Package Forwarders", icon: Users, description: "People who forward parcels to other countries" },
      { id: "legs", label: "International Routes", icon: Globe, description: "Multi-hop shipping routes for international delivery" },
      { id: "shipping", label: "Shipping Rates", icon: ClipboardList, description: "Delivery costs by country" },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    tabs: [
      { id: "labtests", label: "Vendor COAs", icon: FileCheck, description: "Certificates of Analysis from vendors" },
      { id: "testinggroups", label: "Lab Testing Pool", icon: Users, description: "Coordinate member contributions for lab testing" },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    tabs: [
      { id: "settings", label: "Settings", icon: Settings, description: "Edit group buy details and dates" },
      { id: "products", label: "Products", icon: Package, description: "Manage product catalogue" },
      { id: "rules", label: "Rules & Info", icon: Shield, description: "Messages and rules shown to members" },
    ],
  },
];

export const WORKSPACE_PAGE_META: Record<WorkspaceTabId, {
  title: string;
  description: string;
  primaryAction?: string;
}> = {
  overview: {
    title: "Winter Peptide Run 2025",
    description: "Monitor orders, payments, fulfillment, and member activity.",
    primaryAction: "Create order",
  },
  todos: {
    title: "Tasks",
    description: "Track organiser work and operational follow-ups.",
    primaryAction: "Create task",
  },
  members: {
    title: "Members",
    description: "See every participant, their orders, payments, and fulfilment progress.",
    primaryAction: "Message members",
  },
  orders: {
    title: "Orders",
    description: "Review payments, products, and fulfillment status.",
    primaryAction: "Create order",
  },
  broadcast: {
    title: "Announcements",
    description: "Send group-buy updates and review message delivery.",
    primaryAction: "New announcement",
  },
  parcels: {
    title: "Incoming parcels",
    description: "Track inbound supplier parcels and their contents.",
    primaryAction: "Add parcel",
  },
  dispatch: {
    title: "Dispatch",
    description: "Select received parcels and dispatch fulfillable orders.",
  },
  qrcodes: {
    title: "Shipping labels",
    description: "Manage member shipping labels and QR status.",
  },
  reshippers: {
    title: "Package forwarders",
    description: "Manage forwarders and their assigned destinations.",
    primaryAction: "Add forwarder",
  },
  legs: {
    title: "International routes",
    description: "Coordinate country legs and parcel hand-offs.",
    primaryAction: "Add leg",
  },
  shipping: {
    title: "Shipping rates",
    description: "Configure delivery methods, countries, and prices.",
    primaryAction: "Add rate",
  },
  pnl: {
    title: "Profit & loss",
    description: "Monitor revenue, costs, and margin.",
  },
  labtests: {
    title: "Vendor COAs",
    description: "Store and review vendor certificates.",
  },
  testinggroups: {
    title: "Lab testing pool",
    description: "Coordinate samples, contributions, and results.",
  },
  summary: {
    title: "Supplier summary",
    description: "Review and export the supplier order rollup.",
  },
  tickets: {
    title: "Tickets",
    description: "Resolve member questions and operational issues.",
  },
  settings: {
    title: "Settings",
    description: "Manage the active group buy configuration.",
  },
  products: {
    title: "Products",
    description: "Manage the group-buy catalogue and pricing.",
    primaryAction: "Add product",
  },
  rules: {
    title: "Rules & info",
    description: "Edit member-facing information and participation rules.",
  },
};

// ─── Setup wizard steps ──────────────────────────────────────────────────────
// The guided flow a new organiser walks through to stand up a GB.

export interface WizardStep {
  id: string;
  label: string;
  blurb: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "basics",   label: "Basics",         blurb: "Name, currency and close date" },
  { id: "products", label: "Products",       blurb: "What people can order" },
  { id: "shipping", label: "Shipping",       blurb: "Delivery options and costs" },
  { id: "payments", label: "Accepting Payments", blurb: "How you get paid" },
  { id: "access",   label: "Access",         blurb: "Who can join and any entry fee" },
  { id: "rules",    label: "Rules & Info",   blurb: "Messages and rules shown to members" },
  { id: "review",   label: "Review & Launch", blurb: "Check everything, then go live" },
];
