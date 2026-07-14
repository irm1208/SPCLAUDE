import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { FolderCog } from "lucide-react";
import { WORKSPACE_PAGE_META, type WorkspaceTabId } from "./nav";
import { SAMPLE_GBS } from "./data";
import { loadGb } from "./storage";
import OverviewTabV3 from "./OverviewTabV3";
import OrdersTab from "./OrdersTab";
import TodoTab from "./TodoTab";
import BroadcastTab from "./BroadcastTab";
import ParcelsTab from "./ParcelsTab";
import DispatchTab from "./DispatchTab";
import QrCodesTab from "./QrCodesTab";
import ReshippersTab from "./ReshippersTab";
import CountryLegsTab from "./CountryLegsTab";
import ShippingTab from "./ShippingTab";
import PnLTab from "./PnLTab";
import VendorCoasTab from "./VendorCoasTab";
import TestingGroupsTab from "./TestingGroupsTab";
import TicketsTab from "./TicketsTab";
import GbSettingsTab from "./GbSettingsTab";
import GbProductsTab from "./GbProductsTab";
import RulesTab from "./RulesTab";
import SummaryTab from "./SummaryTab";
import GlobalSearch from "./GlobalSearch";
import DashboardSidebar from "./DashboardSidebar";
import OrganiserShell from "./OrganiserShell";
import OrganiserTopbar from "./OrganiserTopbar";
import { createInitialDeskState } from "./dispatch/sample-data";
import { getReadyCount } from "./dispatch/model";
import WorkspaceScreen from "./WorkspaceScreen";
import { createPrototypeOrganiserRepositories } from "./domain/repositories";
import { OrganiserRepositoryProvider } from "./domain/repository-context";

export default function Workspace({ onModeChange }: { onModeChange?: () => void }) {
  const [active, setActive] = useState<WorkspaceTabId>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const [dispatchState, setDispatchState] = useState(createInitialDeskState);
  const [shareCopied, setShareCopied] = useState(false);
  const gb = SAMPLE_GBS[0];
  const repositories = useMemo(
    () => createPrototypeOrganiserRepositories({ groupBuyId: gb.id }),
    [gb.id],
  );
  const repositoryOrders = useSyncExternalStore(
    repositories.orders.subscribe,
    repositories.orders.getSnapshot,
    repositories.orders.getSnapshot,
  );
  const pageMeta = WORKSPACE_PAGE_META[active];
  const readyDispatchCount = getReadyCount(dispatchState);

  const tickets = loadGb<Array<{ id: string; unreadCount?: number }>>(gb.id, "tickets", [], "v2Tickets");
  const ticketUnreadCount = tickets.reduce((total, ticket) => total + (ticket.unreadCount ?? 0), 0);
  const pendingContributions = loadGb<unknown[]>(gb.id, "testingPendingContribs", [], "v2TestingPendingContribs");
  const pendingPayments = repositoryOrders.filter(order => order.status === "pending").length;

  const badges: Partial<Record<WorkspaceTabId, number>> = {
    tickets: ticketUnreadCount,
    testinggroups: pendingContributions.length,
    orders: pendingPayments,
    dispatch: readyDispatchCount,
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

  const handleShare = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  };

  const activeContent = active === "overview" ? (
    <OverviewTabV3
      selectedGbId={gb.id}
      gb={gb}
      dispatchReadyCount={readyDispatchCount}
      onGoto={tab => setActive(tab as WorkspaceTabId)}
    />
  ) : active === "orders" ? (
    <OrdersTab selectedGbId={gb.id} highlightId={highlightId} />
  ) : active === "todos" ? (
    <TodoTab selectedGbId={gb.id} highlightId={highlightId} />
  ) : active === "broadcast" ? (
    <BroadcastTab />
  ) : active === "parcels" ? (
    <ParcelsTab />
  ) : active === "dispatch" ? (
    <DispatchTab state={dispatchState} onStateChange={setDispatchState} />
  ) : active === "qrcodes" ? (
    <QrCodesTab selectedGbId={gb.id} />
  ) : active === "reshippers" ? (
    <ReshippersTab selectedGbId={gb.id} />
  ) : active === "legs" ? (
    <CountryLegsTab selectedGbId={gb.id} />
  ) : active === "shipping" ? (
    <ShippingTab selectedGbId={gb.id} />
  ) : active === "pnl" ? (
    <PnLTab selectedGbId={gb.id} />
  ) : active === "labtests" ? (
    <VendorCoasTab selectedGbId={gb.id} />
  ) : active === "testinggroups" ? (
    <TestingGroupsTab selectedGbId={gb.id} />
  ) : active === "tickets" ? (
    <TicketsTab selectedGbId={gb.id} />
  ) : active === "settings" ? (
    <GbSettingsTab selectedGbId={gb.id} />
  ) : active === "products" ? (
    <GbProductsTab selectedGbId={gb.id} />
  ) : active === "rules" ? (
    <RulesTab selectedGbId={gb.id} />
  ) : (
    <SummaryTab selectedGbId={gb.id} />
  );

  return (
    <OrganiserRepositoryProvider value={repositories}>
      <OrganiserShell
        sidebar={(onNavigate, onCollapse, collapsed) => (
          <DashboardSidebar
            activeTab={active}
            onTabChange={setActive}
            gbName={gb.name}
            userName="Organiser"
            badges={badges}
            onNavigate={onNavigate}
            onSwitchMode={onModeChange}
            onCollapse={onCollapse}
            collapsed={collapsed}
          />
        )}
        topbar={onOpenMenu => (
          <OrganiserTopbar
            groupName={gb.name}
            pageLabel={pageMeta.title}
            onOpenMenu={onOpenMenu}
            onSearch={() => setSearchOpen(true)}
            onBack={() => setActive("overview")}
            onShare={handleShare}
            secondaryActions={(
              <button type="button" className="ov2-secondary-button" onClick={onModeChange}>
                <FolderCog aria-hidden="true" /> Manage
              </button>
            )}
            primaryAction={active === "overview" ? { label: "Create order", onClick: () => setActive("orders") } : undefined}
          />
        )}
      >
        <WorkspaceScreen pageId={active}>
          {shareCopied ? <div className="ov2-copy-toast" role="status">Workspace link copied</div> : null}
          {activeContent}
        </WorkspaceScreen>
      </OrganiserShell>

      <GlobalSearch
        selectedGbId={gb.id}
        onNavigate={handleNavigate}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </OrganiserRepositoryProvider>
  );
}
