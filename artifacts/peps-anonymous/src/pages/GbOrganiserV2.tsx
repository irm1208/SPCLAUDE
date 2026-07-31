import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useAccount } from "@/hooks/use-account";
import type { OrganiserGB } from "./GbOrganiser";
import SetupWizard from "./organiser-v2/SetupWizard";
import Workspace from "./organiser-v2/Workspace";
import WelcomeModal from "./organiser-v2/WelcomeModal";
import { V2_VARS } from "./organiser-v2/theme";
import {
  CommandPalette,
  ShortcutsModal,
  useKeyboardShortcuts,
  type CommandAction,
} from "./organiser-v2/KeyboardShortcuts";
import {
  mapApiGroupBuy,
  organiserApi,
  type ApiGroupBuy,
  type OrganiserProfile,
} from "./organiser-v2/api/organiser-api";
import "./organiser-v2/organiser-v2.css";
import "./organiser-v2/peps-native.css";
import "./organiser-v2/approved-workspace.css";
import "./organiser-v2/approved-orders.css";
import "./organiser-v2/approved-tabs.css";
import "./organiser-v2/products-split-inspector.css";

type Mode = "setup" | "workspace";

export default function GbOrganiserV2() {
  const { account, isLoading: accountLoading } = useAccount();
  const queryClient = useQueryClient();
  const [mode, setModeState] = useState<Mode>(() => localStorage.getItem("v2:organiserMode") === "setup" ? "setup" : "workspace");
  const [selectedGroupBuyId, setSelectedGroupBuyId] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("gb");
    return fromUrl ?? localStorage.getItem("v2:selectedGroupBuyId") ?? "";
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const profileQuery = useQuery<OrganiserProfile>({
    queryKey: ["organiser", "profile"],
    queryFn: organiserApi.profile,
    enabled: Boolean(account),
    retry: false,
    staleTime: 60_000,
  });
  const isApprovedOrganiser = profileQuery.data?.organiserStatus === "approved";
  const groupBuysQuery = useQuery<ApiGroupBuy[]>({
    queryKey: ["organiser", "group-buys"],
    queryFn: organiserApi.groupBuys,
    enabled: isApprovedOrganiser,
    retry: false,
    staleTime: 30_000,
  });
  const groupBuys = useMemo(
    () => (groupBuysQuery.data ?? []).map(mapApiGroupBuy),
    [groupBuysQuery.data],
  );
  const selectedGroupBuy = groupBuys.find(groupBuy => groupBuy.id === selectedGroupBuyId) ?? groupBuys[0];
  const selectedApiGroupBuy = (groupBuysQuery.data ?? []).find(groupBuy => groupBuy.id === selectedGroupBuy?.id);

  const handleGroupBuyUpdated = (updated: OrganiserGB) => {
    queryClient.setQueryData<ApiGroupBuy[]>(["organiser", "group-buys"], current => (
      (current ?? []).map(groupBuy => groupBuy.id === updated.id ? { ...groupBuy, ...updated } : groupBuy)
    ));
  };

  useEffect(() => {
    if (!accountLoading && !account) {
      window.location.replace("/login?next=/gborganiser-v2");
    }
  }, [account, accountLoading]);

  useEffect(() => {
    if (!selectedGroupBuy || selectedGroupBuy.id === selectedGroupBuyId) return;
    setSelectedGroupBuyId(selectedGroupBuy.id);
    localStorage.setItem("v2:selectedGroupBuyId", selectedGroupBuy.id);
  }, [selectedGroupBuy, selectedGroupBuyId]);

  const setMode = (nextMode: Mode) => {
    localStorage.setItem("v2:organiserMode", nextMode);
    setModeState(nextMode);
  };

  const commands: CommandAction[] = [
    {
      id: "switch-setup",
      label: "Switch to Setup",
      description: "Open the setup flow",
      keywords: ["setup", "wizard", "create"],
      category: "Navigation",
      action: () => setMode("setup"),
    },
    {
      id: "switch-workspace",
      label: "Switch to Workspace",
      description: "Open the group-buy dashboard",
      keywords: ["workspace", "dashboard"],
      category: "Navigation",
      action: () => setMode("workspace"),
    },
    {
      id: "show-shortcuts",
      label: "Show Keyboard Shortcuts",
      description: "View all available shortcuts",
      shortcut: "?",
      keywords: ["shortcuts", "help", "keys"],
      category: "Help",
      action: () => setShowShortcutsModal(true),
    },
  ];

  useKeyboardShortcuts({
    "Cmd+/": () => setShowCommandPalette(true),
    "?": () => setShowShortcutsModal(true),
  });

  const isBootstrapping = accountLoading || (Boolean(account) && profileQuery.isLoading);

  if (isBootstrapping || (!account && !accountLoading)) {
    return (
      <div className="organiser-v2" style={V2_VARS}>
        <div className="ov2-route-state" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          <strong>Connecting to your organiser workspace…</strong>
          <span>Loading your account and group buys.</span>
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="organiser-v2" style={V2_VARS}>
        <div className="ov2-route-state" role="alert">
          <AlertCircle aria-hidden="true" />
          <strong>We couldn’t load your organiser access.</strong>
          <span>{profileQuery.error instanceof Error ? profileQuery.error.message : "Please try again."}</span>
          <button type="button" onClick={() => profileQuery.refetch()}>Try again</button>
        </div>
      </div>
    );
  }

  if (!isApprovedOrganiser) {
    return (
      <div className="organiser-v2" style={V2_VARS}>
        <div className="ov2-route-state">
          <AlertCircle aria-hidden="true" />
          <strong>Approved organiser access is required.</strong>
          <span>Your current status is {profileQuery.data?.organiserStatus ?? "not applied"}.</span>
          <button type="button" onClick={() => window.location.assign("/gborganiser")}>Manage organiser access</button>
        </div>
      </div>
    );
  }

  if (groupBuysQuery.isLoading) {
    return (
      <div className="organiser-v2" style={V2_VARS}>
        <div className="ov2-route-state" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          <strong>Loading live group buys…</strong>
        </div>
      </div>
    );
  }

  if (groupBuysQuery.isError) {
    return (
      <div className="organiser-v2" style={V2_VARS}>
        <div className="ov2-route-state" role="alert">
          <AlertCircle aria-hidden="true" />
          <strong>We couldn’t load your group buys.</strong>
          <span>{groupBuysQuery.error instanceof Error ? groupBuysQuery.error.message : "Please try again."}</span>
          <button type="button" onClick={() => groupBuysQuery.refetch()}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="organiser-v2" style={V2_VARS}>
      {mode === "setup" || !selectedGroupBuy || !selectedApiGroupBuy ? (
        <SetupWizard
          onCompleted={created => {
            queryClient.setQueryData<ApiGroupBuy[]>(["organiser", "group-buys"], current => {
              const remaining = (current ?? []).filter(groupBuy => groupBuy.id !== created.id);
              return [created, ...remaining];
            });
            setSelectedGroupBuyId(created.id);
            localStorage.setItem("v2:selectedGroupBuyId", created.id);
          }}
          onModeChange={() => setMode("workspace")}
        />
      ) : (
        <Workspace
          groupBuy={selectedGroupBuy}
          apiGroupBuy={selectedApiGroupBuy as unknown as OrganiserGB}
          organiserName={profileQuery.data?.telegramUsername ?? account?.telegramUsername ?? "Organiser"}
          onGroupBuyUpdated={handleGroupBuyUpdated}
          onModeChange={() => setMode("setup")}
          onCloned={cloned => {
            // Add the new GB to the query cache and select it
            queryClient.setQueryData<ApiGroupBuy[]>(["organiser", "group-buys"], current => {
              const existing = (current ?? []).filter(gb => gb.id !== cloned.id);
              return [cloned, ...existing];
            });
            setSelectedGroupBuyId(cloned.id);
            localStorage.setItem("v2:selectedGroupBuyId", cloned.id);
          }}
        />
      )}

      {showWelcome ? (
        <WelcomeModal
          onStart={() => {
            setMode("setup");
            setShowWelcome(false);
          }}
          onDismiss={() => setShowWelcome(false)}
        />
      ) : null}

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} actions={commands} />
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={[
          { key: "Cmd+/", description: "Open command palette", category: "General" },
          { key: "?", description: "Show keyboard shortcuts", category: "General" },
          { key: "Esc", description: "Close modals", category: "General" },
        ]}
      />
    </div>
  );
}
