import { useCallback, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { SageChat } from "@/components/SageChat";
import { useThemeStore } from "@/hooks/use-theme";
import { DashboardShell, palette, ACCENT } from "@/components/DashboardShell";
import { useAccount, useLogout } from "@/hooks/use-account";
import type { PortalNavProps } from "@/pages/CustomerPortal";

export default function SagePage() {
  const { dark } = useThemeStore();
  const T = palette(dark);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const seedQ = decodeURIComponent(params.get("q") ?? "");
  const openHistory = params.get("history") === "1";
  const { account } = useAccount();
  const { mutate: logout } = useLogout();
  const [hubMoreOpen, setHubMoreOpen] = useState(false);

  const goSection = useCallback((s: string) => {
    navigate(s === "home" ? "/account" : `/account?s=${encodeURIComponent(s)}`);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout(undefined, { onSettled: () => navigate("/") });
  }, [logout, navigate]);

  const navProps = {
    section: "sage",
    setSection: goSection,
    hubMoreOpen,
    setHubMoreOpen,
    account,
  } as unknown as PortalNavProps;

  return (
    <DashboardShell
      activeSection="sage"
      title="Sage AI"
      username={account?.telegramUsername ?? ""}
      credits={account?.credits ?? null}
      orders={[]}
      activeCompounds={[]}
      groupBuys={[]}
      onSection={goSection}
      onLogout={handleLogout}
      navProps={navProps}
    >
      <div style={{ height: "calc(100lvh - 72px)", overflow: "hidden" }}>
        <SageChat
          open={true}
          onClose={() => { if (window.history.length > 1) window.history.back(); else navigate("/account"); }}
          seed={seedQ || undefined}
          openToHistory={openHistory}
          t={T}
          accent={ACCENT}
          fullPage={true}
        />
      </div>
    </DashboardShell>
  );
}
