import type React from "react";
import {
  BadgeCheck,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShoppingBag,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import "../_group.css";

export type ProductShellProps = {
  concept: string;
  children: React.ReactNode;
  onReset?: () => void;
  pageTitle?: string;
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  count?: number;
  active?: boolean;
};

type NavigationGroup = {
  label: "Workspace" | "Fulfilment" | "Communication" | "Group Buy";
  items: NavigationItem[];
};

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", icon: LayoutDashboard },
      { label: "Todo list", icon: ListTodo, count: 4 },
      { label: "Orders", icon: ShoppingBag, count: 18 },
      { label: "Members", icon: Users, count: 42 },
    ],
  },
  {
    label: "Fulfilment",
    items: [
      { label: "Products", icon: Boxes, active: true },
      { label: "Parcels & dispatch", icon: Truck, count: 2 },
      { label: "Vendor COAs", icon: BadgeCheck, count: 2 },
      { label: "Lab testing pool", icon: FlaskConical },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Broadcast", icon: Send },
      { label: "Tickets", icon: MessageSquareText, count: 3 },
    ],
  },
  {
    label: "Group Buy",
    items: [
      { label: "Profit & loss", icon: CircleDollarSign },
      { label: "Settings & rules", icon: Settings2 },
    ],
  },
];

export function ProductShell({
  concept,
  children,
  onReset,
  pageTitle = "Products",
}: ProductShellProps) {
  return (
    <div className="gbpr-shell">
      <a className="gbpr-skip-link" href="#gbpr-content">
        Skip to products content
      </a>

      <aside className="gbpr-sidebar" aria-label="GB Organiser sidebar">
        <div className="gbpr-brand">
          <span className="gbpr-brand-mark" aria-hidden="true">
            <FlaskConical />
          </span>
          <span className="gbpr-brand-copy">
            <small>Peps Anonymous</small>
            <strong>GB Organiser</strong>
          </span>
        </div>

        <button
          type="button"
          className="gbpr-buy-switcher"
          aria-label="Switch active group buy"
        >
          <span className="gbpr-buy-monogram" aria-hidden="true">
            W25
          </span>
          <span className="gbpr-buy-copy">
            <small>Active group buy</small>
            <strong>Winter Peptide Run 2025</strong>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>

        <nav aria-label="Organiser navigation" className="gbpr-navigation">
          {NAVIGATION_GROUPS.map((group) => (
            <section className="gbpr-nav-group" key={group.label}>
              <h2 className="gbpr-nav-title">{group.label}</h2>
              <div className="gbpr-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      className="gbpr-nav-item"
                      data-active={item.active ? "true" : undefined}
                      aria-label={item.label}
                      aria-current={item.active ? "page" : undefined}
                      key={item.label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.count !== undefined ? (
                        <em className="gbpr-nav-count">{item.count}</em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="gbpr-sidebar-footer">
          <div className="gbpr-sidebar-profile">
            <span className="gbpr-avatar" aria-hidden="true">
              AM
            </span>
            <span className="gbpr-sidebar-profile-copy">
              <strong>Alex Morgan</strong>
              <small>Lead organiser</small>
            </span>
            <MoreHorizontal aria-hidden="true" />
          </div>
        </div>
      </aside>

      <div className="gbpr-main">
        <header className="gbpr-topbar">
          <nav aria-label="Breadcrumb" className="gbpr-breadcrumb">
            <span>GB Organiser</span>
            <span aria-hidden="true">/</span>
            <span>Winter Peptide Run 2025</span>
            <span aria-hidden="true">/</span>
            <strong aria-current="page">{pageTitle}</strong>
          </nav>

          <div className="gbpr-topbar-actions">
            <button
              type="button"
              className="gbpr-global-search"
              aria-label="Search this group buy"
            >
              <Search aria-hidden="true" />
              <span>Search this group buy</span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </button>
            <button
              type="button"
              className="gbpr-icon-button gbpr-notifications"
              aria-label="Notifications"
            >
              <Bell aria-hidden="true" />
              <span className="gbpr-notification-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="gbpr-profile-control"
              aria-label="Open profile menu"
            >
              <span className="gbpr-avatar" aria-hidden="true">
                AM
              </span>
              <span className="gbpr-profile-copy">
                <strong>Alex Morgan</strong>
                <small>Lead organiser</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </header>

        <main
          className="gbpr-page"
          id="gbpr-content"
          aria-labelledby="gbpr-page-title"
        >
          <h1
            className="gbpr-visually-hidden"
            id="gbpr-page-title"
            tabIndex={-1}
            data-gbpr-focus-fallback
          >
            {pageTitle}
          </h1>
          <div className="gbpr-concept-kicker">
            <ClipboardList aria-hidden="true" />
            <span>Products workspace</span>
            <strong>{concept}</strong>
          </div>
          {children}
        </main>
      </div>

      {onReset ? (
        <button
          type="button"
          className="gbpr-reset"
          onClick={onReset}
          aria-label="Reset product preview"
        >
          <RotateCcw aria-hidden="true" />
          <span>Reset preview</span>
        </button>
      ) : null}
    </div>
  );
}
