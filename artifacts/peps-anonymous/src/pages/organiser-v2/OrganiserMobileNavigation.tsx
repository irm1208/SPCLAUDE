import { MoreHorizontal } from "lucide-react";
import { MOBILE_WORKSPACE_TABS, type WorkspaceTabId } from "./nav";

export default function OrganiserMobileNavigation({
  activeTab,
  onTabChange,
  onOpenMore,
}: {
  activeTab: WorkspaceTabId;
  onTabChange: (tab: WorkspaceTabId) => void;
  onOpenMore: () => void;
}) {
  const primaryIds = new Set<WorkspaceTabId>(MOBILE_WORKSPACE_TABS.map(tab => tab.id));
  return (
    <nav className="ov2-mobile-bottom-nav" aria-label="Mobile organiser navigation">
      {MOBILE_WORKSPACE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            className={isActive ? "is-active" : undefined}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={!primaryIds.has(activeTab) ? "is-context-active" : undefined}
        aria-haspopup="dialog"
        onClick={onOpenMore}
      >
        <MoreHorizontal aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
