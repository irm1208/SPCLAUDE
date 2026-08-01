import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, GraduationCap, Search } from "lucide-react";
import { TOUR_EVENT_START } from "./tour/tour-script";
import { buildTopbarContext } from "./topbar-context";

export interface OrganiserTopbarProps {
  groupName: string;
  groupStatus?: string | null;
  memberCount?: number | null;
  orderCount?: number | null;
  pageLabel: string;
  onOpenMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onSearch: () => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  secondaryActions?: ReactNode;
  onProfile?: () => void;
  organiserName?: string;
  organiserRole?: string;
}

function MenuGlyph() {
  return (
    <span className="ov2-menu-glyph" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function OrganiserTopbar({
  groupName,
  groupStatus,
  memberCount,
  orderCount,
  pageLabel,
  onOpenMenu,
  onToggleSidebar,
  sidebarCollapsed,
  onSearch,
  onBack,
  primaryAction,
  secondaryActions,
  onProfile,
  organiserName = "Alex Morgan",
  organiserRole = "Lead organiser",
}: OrganiserTopbarProps) {
  const organiserInitials = organiserName
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const context = buildTopbarContext({ status: groupStatus, memberCount, orderCount });

  return (
    <header className="ov2-topbar">
      <div className="ov2-topbar-context-rail" aria-label="Group buy summary" data-tour="topbar-context">
        <span className="ov2-topbar-context-kicker">Group buy</span>
        <dl className="ov2-topbar-context-metrics">
          <div className="ov2-topbar-context-metric">
            <dt>Status</dt>
            <dd className="ov2-topbar-status" data-tone={context.statusTone}>{context.statusLabel}</dd>
          </div>
          <div className="ov2-topbar-context-metric">
            <dt>Members</dt>
            <dd>{context.memberLabel}</dd>
          </div>
          <div className="ov2-topbar-context-metric">
            <dt>Orders</dt>
            <dd>{context.orderLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="ov2-topbar-workbar">
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-desktop"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Open navigation" : "Collapse navigation"}
          aria-expanded={!sidebarCollapsed}
        >
          <MenuGlyph />
        </button>
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-drawer"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          aria-haspopup="dialog"
        >
          <MenuGlyph />
        </button>
        {onBack ? (
          <button type="button" className="ov2-icon-button ov2-back-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}

        <div className="ov2-mobile-group-context">
          <small>Active group buy</small>
          <strong title={groupName}>{groupName}</strong>
        </div>

        <div className="ov2-page-context">
          <strong title={pageLabel}>{pageLabel}</strong>
          <small>GB Organiser workspace</small>
        </div>

        <button type="button" className="ov2-search-trigger" onClick={onSearch} aria-label="Search orders, members, and parcels" data-tour="topbar-search">
          <Search aria-hidden="true" />
          <span>Search orders, members, parcels…</span>
          <kbd aria-hidden="true">⌘ K</kbd>
        </button>

        <div className="ov2-topbar-actions">
          <button
            type="button"
            className="ov2-secondary-button"
            onClick={() => window.dispatchEvent(new CustomEvent(TOUR_EVENT_START))}
            title="Take the guided tour"
            data-tour="topbar-tour-button"
          >
            <GraduationCap aria-hidden="true" /> <span className="ov2-action-label">Tour</span>
          </button>
          {secondaryActions}
          {primaryAction ? (
            <button type="button" className="ov2-primary-button" onClick={primaryAction.onClick}>
              <span>{primaryAction.label}</span>
            </button>
          ) : null}
        </div>

        {onProfile ? (
          <button
            type="button"
            className="ov2-topbar-profile"
            onClick={onProfile}
            aria-label={`Open organiser profile for ${organiserName}`}
            title="Organiser profile"
          >
            <span className="ov2-topbar-avatar" aria-hidden="true">{organiserInitials}</span>
            <span className="ov2-topbar-profile-copy">
              <strong>{organiserName}</strong>
              <small>{organiserRole}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
