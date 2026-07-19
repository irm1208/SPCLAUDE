import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  PanelLeftClose,
  Settings,
} from "lucide-react";
import { WORKSPACE_GROUPS, WIZARD_STEPS, type WorkspaceTabId } from "./nav";

interface Props {
  activeTab?: WorkspaceTabId;
  onTabChange?: (tab: WorkspaceTabId) => void;
  gbName?: string;
  gbStatus?: "draft" | "active" | "closed" | "archived";
  gbCloseDate?: string | null;
  userName?: string;
  badges?: Partial<Record<WorkspaceTabId, number>>;
  mode?: "workspace" | "setup";
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onNavigate?: () => void;
  onSwitchMode?: () => void;
  onExitDashboard?: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
}

function initialsOf(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GB";
  return parts.slice(0, 2).map(part => part[0]!.toUpperCase()).join("");
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function DashboardSidebar({
  activeTab = "overview",
  onTabChange,
  gbName = "Group buy",
  gbStatus,
  gbCloseDate,
  userName = "Organiser",
  badges = {},
  mode = "workspace",
  currentStep = 0,
  onStepChange,
  onNavigate,
  onSwitchMode,
  onExitDashboard,
  onCollapse,
  collapsed = false,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(WORKSPACE_GROUPS.map(group => group.id)),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(previous => {
      const next = new Set(previous);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const selectTab = (tabId: WorkspaceTabId) => {
    onTabChange?.(tabId);
    onNavigate?.();
  };

  const selectStep = (index: number) => {
    onStepChange?.(index);
    onNavigate?.();
  };

  return (
    <div className="ov2-sidebar">
      <div className="ov2-brand-block">
        <div className="ov2-brand-mark" aria-hidden="true">
          <svg width="42" height="42" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="26" fill="#1B3A7A"/>
            <text x="90" y="122" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="76" fontWeight="400" letterSpacing="-1.5" fill="white">S&amp;P</text>
          </svg>
        </div>
        <div className="ov2-brand-copy">
          <strong>Salt &amp; Peps</strong>
          <span>GB Organiser</span>
        </div>
        <button type="button" className="ov2-sidebar-collapse" onClick={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <PanelLeftClose aria-hidden="true" />
        </button>
      </div>

      {mode === "workspace" ? (() => {
        const closeDateLabel = gbCloseDate ? formatShortDate(gbCloseDate) : "";
        const statusLine = gbStatus === "active"
          ? (closeDateLabel ? `Open · Closes ${closeDateLabel}` : "Open for orders")
          : gbStatus === "draft"
            ? "Draft · Not yet live"
            : gbStatus === "closed"
              ? (closeDateLabel ? `Closed ${closeDateLabel}` : "Closed")
              : gbStatus === "archived"
                ? "Archived"
                : "";
        const cardKicker = gbStatus === "active" ? "Active group buy" : "Current group buy";
        return (
          <button
            type="button"
            className="ov2-active-gb-card"
            onClick={() => selectTab("overview")}
            aria-label={`${cardKicker}: ${gbName}.${statusLine ? ` ${statusLine}.` : ""}`}
          >
            <span className="ov2-active-gb-mark" aria-hidden="true">{initialsOf(gbName)}</span>
            <span className="ov2-active-gb-copy">
              <span>{cardKicker}</span>
              <strong>{gbName}</strong>
              {statusLine ? (
                <small>{gbStatus === "active" ? <i className="ov2-live-dot" aria-hidden="true" /> : null} {statusLine}</small>
              ) : null}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        );
      })() : null}

      <div className="ov2-sidebar-scroll">
        {mode === "setup" ? (
          <nav className="ov2-setup-nav" aria-label="Group buy setup steps">
            <p className="ov2-sidebar-kicker">Create group buy</p>
            {WIZARD_STEPS.map((step, index) => {
              const isCurrent = index === currentStep;
              const isComplete = index < currentStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  className={isCurrent ? "ov2-setup-link is-active" : "ov2-setup-link"}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${step.label}: ${step.blurb}`}
                  onClick={() => selectStep(index)}
                >
                  <span className="ov2-step-number" data-complete={isComplete || undefined}>
                    {isComplete ? <Check aria-hidden="true" /> : index + 1}
                  </span>
                  <span><strong>{step.label}</strong><small>{step.blurb}</small></span>
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="ov2-workspace-nav" aria-label="Workspace sections">
            {WORKSPACE_GROUPS.map(group => {
              const expanded = expandedGroups.has(group.id);
              return (
                <section key={group.id} className="ov2-nav-group">
                  {group.label ? (
                    <button
                      type="button"
                      className="ov2-nav-group-toggle"
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(group.id)}
                    >
                      {group.label}
                      <ChevronDown aria-hidden="true" data-collapsed={!expanded || undefined} />
                    </button>
                  ) : null}
                  {expanded || !group.label ? (
                    <div className={group.label ? "ov2-nav-group-items is-nested" : "ov2-nav-group-items"}>
                      {group.tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = badges[tab.id];
                        return (
                          <button
                            type="button"
                            key={tab.id}
                            className={isActive ? "ov2-nav-link is-active" : "ov2-nav-link"}
                            aria-current={isActive ? "page" : undefined}
                            title={tab.description}
                            onClick={() => selectTab(tab.id)}
                          >
                            <Icon aria-hidden="true" />
                            <span>{tab.label}</span>
                            {count ? <em>{count}</em> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </nav>
        )}
      </div>

      <div className="ov2-sidebar-utilities">
        <button type="button" className="ov2-dashboard-exit" onClick={onExitDashboard} aria-label="Back to main dashboard">
          <ArrowLeft aria-hidden="true" />
          <span>Back to main dashboard</span>
        </button>
        <button
          type="button"
          className="ov2-setup-switch"
          onClick={onSwitchMode}
          aria-label={mode === "setup" ? "Return to workspace" : "Edit group buy setup"}
        >
          <Settings aria-hidden="true" />
          <span>{mode === "setup" ? "Return to workspace" : "Edit GB setup"}</span>
        </button>
      </div>

      <div className="ov2-profile-block">
        <span className="ov2-profile-avatar" aria-hidden="true">{initialsOf(userName)}</span>
        <span><strong>{userName}</strong><small>Organiser</small></span>
        <ChevronDown aria-hidden="true" />
      </div>
    </div>
  );
}
