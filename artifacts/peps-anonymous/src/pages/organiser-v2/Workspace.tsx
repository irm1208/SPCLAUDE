import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, FolderCog } from "lucide-react";
import CloneGroupBuyModal from "./CloneGroupBuyModal";
import type { ApiGroupBuy } from "./api/organiser-api";
import { WORKSPACE_PAGE_META, type WorkspaceTabId } from "./nav";
import type { SampleGB } from "./data";
import OverviewTabV3 from "./OverviewTabV3";
import OrdersTab from "./OrdersTab";
import TodoTab from "./TodoTab";
import DispatchTab from "./DispatchTab";
import QrCodesTab from "./QrCodesTab";
import TestingGroupsTab from "./TestingGroupsTab";
import GbSettingsTab from "./GbSettingsTab";
import MembersTab from "./MembersTab";
import GbProductsTab from "./GbProductsTab";
import {
  BroadcastTab as LiveBroadcastTab,
  LabTestsTabOrg as LiveLabTestsTabOrg,
  OrgTicketsTab as LiveOrgTicketsTab,
  OrganiserCountryLegsTab as LiveOrganiserCountryLegsTab,
  OrganiserReshippersTab as LiveOrganiserReshippersTab,
  OrganiserRulesTab as LiveOrganiserRulesTab,
  ParcelsTab as LiveParcelsTab,
  PnlTab as LivePnlTab,
  ShippingPayTab as LiveShippingPayTab,
  SummaryTab as LiveSummaryTab,
  type OrganiserGB,
} from "../GbOrganiser";
import GlobalSearch from "./GlobalSearch";
import DashboardSidebar from "./DashboardSidebar";
import OrganiserShell from "./OrganiserShell";
import OrganiserTopbar from "./OrganiserTopbar";
import OrganiserMobileNavigation from "./OrganiserMobileNavigation";
import WorkspaceScreen from "./WorkspaceScreen";
import { createApiOrganiserRepositories } from "./domain/repositories";
import { OrganiserRepositoryProvider } from "./domain/repository-context";
import { mergeMemberDirectory } from "./domain/member";
import { deriveOrderAttentionSummary } from "./domain/order-selectors";
import { organiserApi } from "./api/organiser-api";
import { TOUR_EVENT_ACTIVE_TAB, TOUR_EVENT_WORKSPACE_TAB } from "./tour/tour-script";

const WORKSPACE_PRIMARY_NAVIGATION: Partial<Record<WorkspaceTabId, { label: string; target: WorkspaceTabId }>> = {
  overview: { label: "Create order", target: "orders" },
  orders: { label: "Open dispatch", target: "dispatch" },
  dispatch: { label: "View QR codes", target: "qrcodes" },
  members: { label: "View orders", target: "orders" },
  products: { label: "Open dispatch", target: "dispatch" },
};

const WORKSPACE_TAB_IDS = Object.keys(WORKSPACE_PAGE_META) as WorkspaceTabId[];

function readTabFromUrl(): WorkspaceTabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab && (WORKSPACE_TAB_IDS as string[]).includes(tab) ? (tab as WorkspaceTabId) : "overview";
}

function writeTabToUrl(tab: WorkspaceTabId): void {
  const url = new URL(window.location.href);
  if (tab === "overview") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  window.history.replaceState(window.history.state, "", url);
}

export default function Workspace({
  groupBuy,
  apiGroupBuy,
  organiserName,
  onGroupBuyUpdated,
  onModeChange,
  onCloned,
  onChooseGroupBuy,
}: {
  groupBuy: SampleGB;
  apiGroupBuy: OrganiserGB;
  organiserName: string;
  onGroupBuyUpdated: (groupBuy: OrganiserGB) => void;
  onModeChange?: () => void;
  onCloned?: (newGroupBuy: ApiGroupBuy) => void;
  onChooseGroupBuy?: () => void;
}) {
  const [active, setActiveState] = useState<WorkspaceTabId>(readTabFromUrl);
  const setActive = (tab: WorkspaceTabId) => {
    setActiveState(tab);
    writeTabToUrl(tab);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const [showCloneModal, setShowCloneModal] = useState(false);
  const gb = groupBuy;
  const repositories = useMemo(
    () => createApiOrganiserRepositories({ groupBuyId: gb.id }),
    [gb.id],
  );
  const repositoryOrders = useSyncExternalStore(
    repositories.orders.subscribe,
    repositories.orders.getSnapshot,
    repositories.orders.getSnapshot,
  );
  const pageMeta = WORKSPACE_PAGE_META[active];
  const breadcrumbLabel = active === "overview" ? "Overview" : pageMeta.title;

  const orderAttention = deriveOrderAttentionSummary(repositoryOrders);
  const pendingPayments = orderAttention.paymentCount;
  const readyDispatchCount = orderAttention.dispatchReadyCount;
  const orderLoadState = useSyncExternalStore(
    repositories.orders.subscribe,
    repositories.orders.getLoadState,
    repositories.orders.getLoadState,
  );
  const membersQuery = useQuery({
    queryKey: ["organiser", "members", gb.id],
    queryFn: () => organiserApi.members(gb.id),
    staleTime: 30_000,
  });
  const memberCount = useMemo(
    () => mergeMemberDirectory(repositoryOrders, membersQuery.data ?? []).length,
    [membersQuery.data, repositoryOrders],
  );
  const ticketsQuery = useQuery({
    queryKey: ["organiser", "tickets", gb.id],
    queryFn: () => organiserApi.tickets(gb.id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const testingQuery = useQuery({
    queryKey: ["organiser", "testing", gb.id],
    queryFn: () => organiserApi.testingPool(gb.id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const todosQuery = useQuery({
    queryKey: ["organiser", "todos", gb.id],
    queryFn: () => organiserApi.todos(gb.id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    repositories.orders.load().catch(() => undefined);
  }, [repositories]);

  // Guided tour integration: the tour can switch tabs, and the "your turn"
  // step listens for the tab the user opens themselves.
  useEffect(() => {
    const handler = (event: Event) => setActive((event as CustomEvent<WorkspaceTabId>).detail);
    window.addEventListener(TOUR_EVENT_WORKSPACE_TAB, handler);
    return () => window.removeEventListener(TOUR_EVENT_WORKSPACE_TAB, handler);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT_ACTIVE_TAB, { detail: active }));
  }, [active]);

  const badges: Partial<Record<WorkspaceTabId, number>> = {
    orders: pendingPayments,
    dispatch: readyDispatchCount,
    tickets: (ticketsQuery.data ?? []).filter(ticket => ticket.status === "open" || ticket.status === "in_progress").length,
    testinggroups: testingQuery.data?.contributions.pending ?? 0,
    todos: (todosQuery.data ?? []).filter(todo => todo.status !== "done" && !todo.archived).length,
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = (tab: string, entityId?: string) => {
    setActive(tab as WorkspaceTabId);
    setHighlightId(entityId);
  };

  const primaryNavigation = WORKSPACE_PRIMARY_NAVIGATION[active];
  const primaryAction = primaryNavigation
    ? { label: primaryNavigation.label, onClick: () => handleNavigate(primaryNavigation.target) }
    : onModeChange
      ? { label: "Edit setup", onClick: onModeChange }
      : undefined;

  const activeContent = active === "overview" ? (
    <OverviewTabV3
      selectedGbId={gb.id}
      gb={gb}
      memberCount={memberCount}
      memberLimit={typeof apiGroupBuy.memberLimit === "number" && apiGroupBuy.memberLimit > 0 ? apiGroupBuy.memberLimit : null}
      dispatchReadyCount={readyDispatchCount}
      onGoto={tab => setActive(tab as WorkspaceTabId)}
    />
  ) : active === "orders" ? (
    <OrdersTab selectedGbId={gb.id} highlightId={highlightId} onOpenDispatch={() => setActive("dispatch")} />
  ) : active === "members" ? (
    <MembersTab selectedGbId={gb.id} onOpenOrders={() => setActive("orders")} />
  ) : active === "todos" ? (
    <TodoTab selectedGbId={gb.id} highlightId={highlightId} />
  ) : active === "broadcast" ? (
    <LiveBroadcastTab gb={apiGroupBuy} />
  ) : active === "parcels" ? (
    <LiveParcelsTab gb={apiGroupBuy} />
  ) : active === "dispatch" ? (
    <DispatchTab selectedGbId={gb.id} />
  ) : active === "qrcodes" ? (
    <QrCodesTab selectedGbId={gb.id} />
  ) : active === "reshippers" ? (
    <LiveOrganiserReshippersTab gb={apiGroupBuy} />
  ) : active === "legs" ? (
    <LiveOrganiserCountryLegsTab gb={apiGroupBuy} />
  ) : active === "shipping" ? (
    <LiveShippingPayTab gb={apiGroupBuy} onUpdated={onGroupBuyUpdated} />
  ) : active === "pnl" ? (
    <LivePnlTab gb={apiGroupBuy} />
  ) : active === "labtests" ? (
    <LiveLabTestsTabOrg gb={apiGroupBuy} />
  ) : active === "testinggroups" ? (
    <TestingGroupsTab selectedGbId={gb.id} />
  ) : active === "tickets" ? (
    <LiveOrgTicketsTab gb={apiGroupBuy} />
  ) : active === "settings" ? (
    <GbSettingsTab selectedGbId={gb.id} />
  ) : active === "products" ? (
    <GbProductsTab
      selectedGbId={gb.id}
      groupBuyName={gb.name}
      currency={apiGroupBuy.currency}
    />
  ) : active === "rules" ? (
    <LiveOrganiserRulesTab gb={apiGroupBuy} />
  ) : (
    <LiveSummaryTab gb={apiGroupBuy} />
  );

  return (
    <OrganiserRepositoryProvider value={repositories}>
      <OrganiserShell
        sidebar={(onNavigate, onCollapse, collapsed) => (
          <DashboardSidebar
            activeTab={active}
            onTabChange={setActive}
            gbName={gb.name}
            gbStatus={gb.status}
            gbCloseDate={gb.closeDate}
            userName={organiserName}
            badges={badges}
            onNavigate={onNavigate}
            onSwitchMode={onModeChange}
            onChooseGroupBuy={() => {
              onNavigate();
              onChooseGroupBuy?.();
            }}
            onExitDashboard={() => window.location.assign("/account")}
            onCollapse={onCollapse}
            collapsed={collapsed}
          />
        )}
        topbar={({ onOpenDrawer, onToggleSidebar, sidebarCollapsed }) => (
          <OrganiserTopbar
            groupName={gb.name}
            groupStatus={gb.status}
            memberCount={memberCount}
            orderCount={repositoryOrders.length}
            pageLabel={breadcrumbLabel}
            onOpenMenu={onOpenDrawer}
            onToggleSidebar={onToggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
            onSearch={() => setSearchOpen(true)}
            onProfile={() => window.location.assign("/account")}
            organiserName={organiserName}
            organiserRole="Lead organiser"
            onChooseGroupBuy={onChooseGroupBuy}
            secondaryActions={(
              <>
                {onModeChange ? (
                  <button type="button" className="ov2-secondary-button" onClick={onModeChange}>
                    <FolderCog aria-hidden="true" /> <span className="ov2-action-label">Manage</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ov2-secondary-button"
                  onClick={() => setShowCloneModal(true)}
                  title="Clone this group buy"
                >
                  <Copy aria-hidden="true" /> <span className="ov2-action-label">Clone</span>
                </button>
              </>
            )}
            primaryAction={primaryAction}
          />
        )}
        mobileNavigation={onOpenMore => (
          <OrganiserMobileNavigation
            activeTab={active}
            onTabChange={setActive}
            onOpenMore={onOpenMore}
          />
        )}
      >
        <WorkspaceScreen pageId={active}>
          {orderLoadState === "loading" ? <div className="ov2-data-notice" role="status">Syncing live order data…</div> : null}
          {orderLoadState === "error" ? (
            <div className="ov2-data-notice" data-tone="error" role="alert">
              <span>{repositories.orders.getError()?.message ?? "Order data could not be loaded."}</span>
              <button type="button" onClick={() => repositories.orders.load().catch(() => undefined)}>Retry</button>
            </div>
          ) : null}
          {activeContent}
        </WorkspaceScreen>
      </OrganiserShell>

      <GlobalSearch
        selectedGbId={gb.id}
        onNavigate={handleNavigate}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {showCloneModal ? (
        <CloneGroupBuyModal
          groupBuy={{ id: gb.id, name: gb.name }}
          onCloned={newGroupBuy => {
            setShowCloneModal(false);
            onCloned?.(newGroupBuy);
          }}
          onClose={() => setShowCloneModal(false)}
        />
      ) : null}
    </OrganiserRepositoryProvider>
  );
}
