import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Home,
  ListChecks,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings,
  ShoppingBag,
  Ticket,
  Truck,
  Users,
  X,
} from "lucide-react";

import "./_group.css";

type Props = {
  children: React.ReactNode;
  notice?: string | null;
  onMessage: () => void;
  onCreateOrder: () => void;
  onOpenSearch: () => void;
};

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", icon: Home },
      { label: "Todo List", icon: ListChecks },
      { label: "Members", icon: Users, active: true },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "Orders", icon: ShoppingBag },
      { label: "Broadcast", icon: Megaphone },
    ],
  },
  {
    label: "Fulfilment",
    items: [
      { label: "Parcels", icon: Package },
      { label: "Dispatch", icon: Truck },
      { label: "QR Codes", icon: QrCode },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Profit & Loss", icon: BarChart3 },
      { label: "Vendor COAs", icon: FileCheck },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tickets", icon: Ticket },
      { label: "Settings", icon: Settings },
    ],
  },
] as const;

export function MembersCrmShell({
  children,
  notice,
  onMessage,
  onCreateOrder,
  onOpenSearch,
}: Props) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const restoreMobileTriggerFocusRef = useRef(false);

  const closeMobileNavigation = () => {
    restoreMobileTriggerFocusRef.current = true;
    setMobileNavigationOpen(false);
  };

  const toggleMobileNavigation = () => {
    if (mobileNavigationOpen) {
      closeMobileNavigation();
      return;
    }

    setMobileNavigationOpen(true);
  };

  useEffect(() => {
    if (!mobileNavigationOpen) {
      if (!restoreMobileTriggerFocusRef.current) {
        return;
      }

      const restoreFocusFrame = window.requestAnimationFrame(() => {
        mobileMenuTriggerRef.current?.focus();
        restoreMobileTriggerFocusRef.current = false;
      });

      return () => window.cancelAnimationFrame(restoreFocusFrame);
    }

    const mobileViewport = window.matchMedia("(max-width: 767px)");
    if (!mobileViewport.matches) {
      setMobileNavigationOpen(false);
      return;
    }

    const focusDrawerFrame = window.requestAnimationFrame(() => {
      mobileNavCloseRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreMobileTriggerFocusRef.current = true;
        setMobileNavigationOpen(false);
      }
    };

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        restoreMobileTriggerFocusRef.current = false;
        setMobileNavigationOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    mobileViewport.addEventListener("change", handleViewportChange);

    return () => {
      window.cancelAnimationFrame(focusDrawerFrame);
      document.removeEventListener("keydown", handleKeyDown);
      mobileViewport.removeEventListener("change", handleViewportChange);
    };
  }, [mobileNavigationOpen]);

  return (
    <div className="members-crm" data-page="members">
      <a
        className="members-crm__skip-link"
        href="#members-crm-main"
        inert={mobileNavigationOpen ? true : undefined}
      >
        Skip to member workspace
      </a>

      <aside
        id="members-crm-navigation"
        className="members-crm__sidebar"
        aria-label="GB Organiser navigation"
        data-mobile-open={mobileNavigationOpen ? "true" : "false"}
      >
        <button
          ref={mobileNavCloseRef}
          className="members-crm__close-nav"
          type="button"
          onClick={closeMobileNavigation}
          aria-label="Close GB Organiser navigation"
          title="Close navigation"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div
          className="members-crm__brand"
          aria-label="Peps Anonymous, GB Organiser"
        >
          <div className="members-crm__brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="members-crm__brand-copy">
            <strong>Peps Anonymous</strong>
            <span>GB Organiser</span>
          </div>
        </div>

        <section
          className="members-crm__group-buy"
          aria-label="Active group buy, Winter Peptide Run 2025"
        >
          <div className="members-crm__group-buy-code" aria-hidden="true">
            W25
          </div>
          <div className="members-crm__group-buy-copy">
            <span className="members-crm__eyebrow">Active group buy</span>
            <h2 id="members-crm-group-buy">Winter Peptide Run 2025</h2>
            <div className="members-crm__group-buy-meta">
              <span className="members-crm__status">
                <span aria-hidden="true" />
                Open
              </span>
              <span>Closes 18 July</span>
            </div>
          </div>
        </section>

        <nav className="members-crm__nav" aria-label="Group buy workspace">
          {NAV_GROUPS.map((group) => (
            <div className="members-crm__nav-group" key={group.label}>
              <p className="members-crm__nav-group-title">{group.label}</p>
              <div className="members-crm__nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = "active" in item && item.active;

                  return (
                    <button
                      className={
                        isActive
                          ? "members-crm__nav-item members-crm__nav-item--active"
                          : "members-crm__nav-item"
                      }
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      aria-label={item.label}
                      title={item.label}
                      key={item.label}
                    >
                      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                      <span className="members-crm__nav-text">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="members-crm__sidebar-footer">
          <div className="members-crm__utilities" aria-label="Group buy setup">
            <button
              type="button"
              aria-label="Back to group buys"
              title="Back to group buys unavailable"
              disabled
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span className="members-crm__utility-label">Back to group buys</span>
            </button>
            <button
              type="button"
              aria-label="Edit group buy setup"
              title="Edit group buy setup unavailable"
              disabled
            >
              <Pencil size={16} aria-hidden="true" />
              <span className="members-crm__utility-label">Edit setup</span>
            </button>
          </div>

          <button
            className="members-crm__organiser"
            type="button"
            aria-label="Alex Morgan, Lead organiser profile unavailable"
            title="Alex Morgan — Lead organiser profile unavailable"
            disabled
          >
            <span className="members-crm__avatar" aria-hidden="true">
              AM
            </span>
            <span className="members-crm__profile-copy">
              <strong>Alex Morgan</strong>
              <span>Lead organiser</span>
            </span>
            <ChevronDown
              className="members-crm__profile-chevron"
              size={15}
              aria-hidden="true"
            />
          </button>
        </div>
      </aside>

      <button
        className="members-crm__backdrop"
        type="button"
        onClick={closeMobileNavigation}
        aria-label="Close GB Organiser navigation"
        data-mobile-open={mobileNavigationOpen ? "true" : "false"}
        tabIndex={mobileNavigationOpen ? 0 : -1}
      />

      <div
        className="members-crm__workspace"
        inert={mobileNavigationOpen ? true : undefined}
      >
        <header className="members-crm__topbar">
          <div className="members-crm__topbar-leading">
            <button
              ref={mobileMenuTriggerRef}
              className="members-crm__mobile-menu"
              type="button"
              onClick={toggleMobileNavigation}
              aria-label={
                mobileNavigationOpen
                  ? "Close GB Organiser navigation"
                  : "Open GB Organiser navigation"
              }
              title={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavigationOpen}
              aria-controls="members-crm-navigation"
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            <nav className="members-crm__breadcrumbs" aria-label="Breadcrumb">
              <ol>
                <li>GB Organiser</li>
                <li aria-hidden="true">
                  <ChevronRight size={14} />
                </li>
                <li aria-current="page">Members</li>
              </ol>
            </nav>
          </div>

          <div className="members-crm__topbar-tools">
            <button
              className="members-crm__search"
              type="button"
              onClick={onOpenSearch}
              aria-label="Search this group buy"
            >
              <Search size={16} aria-hidden="true" />
              <span>Search this group buy</span>
              <kbd aria-hidden="true">/</kbd>
            </button>

            <div className="members-crm__actions">
              <button
                className="members-crm__button members-crm__button--secondary"
                type="button"
                onClick={onMessage}
              >
                <MessageSquare size={16} aria-hidden="true" />
                <span>Message members</span>
              </button>
              <button
                className="members-crm__button members-crm__button--primary"
                type="button"
                onClick={onCreateOrder}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Create order</span>
              </button>
            </div>

            <div className="members-crm__topbar-controls">
              <button
                className="members-crm__icon-button"
                type="button"
                aria-label="View notifications, 1 unread"
                title="Notifications unavailable — 1 unread"
                disabled
              >
                <Bell size={18} aria-hidden="true" />
                <span className="members-crm__notification-dot" aria-hidden="true" />
              </button>
              <button
                className="members-crm__topbar-profile"
                type="button"
                aria-label="Alex Morgan profile unavailable"
                title="Alex Morgan profile unavailable"
                disabled
              >
                <span className="members-crm__avatar" aria-hidden="true">
                  AM
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main
          id="members-crm-main"
          className="members-crm__main"
          aria-labelledby="members-crm-title"
        >
          {children}
        </main>

        {notice ? (
          <div
            className="members-crm__notice"
            role="status"
            aria-live="polite"
          >
            {notice}
          </div>
        ) : null}
      </div>
    </div>
  );
}
