import React, { useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell, type DashOrder } from "@/components/DashboardShell";
import { PageLayout } from "@/components/PageLayout";
import { useAccount, useLogout, useAccountOrders } from "@/hooks/use-account";
import type { PortalNavProps } from "@/pages/CustomerPortal";

type ResearchSection = "protocols" | "learn" | "calculator";

const SECTION_TITLE: Record<ResearchSection, string> = {
  protocols:  "Protocols",
  learn:      "Learning Hub",
  calculator: "Calculator",
};

export function ResearchShell({
  active,
  children,
  bare = false,
}: {
  active: ResearchSection;
  children: React.ReactNode;
  /** When true (portal-embed mode) skip both shells and render children directly */
  bare?: boolean;
}) {
  const [, navigate] = useLocation();
  const { account, isLoggedIn } = useAccount();
  const { data: ordersData } = useAccountOrders(null, isLoggedIn);
  const logoutMutation = useLogout();
  const [hubMoreOpen, setHubMoreOpen] = useState(false);

  if (bare) return <>{children}</>;

  if (!isLoggedIn) {
    return <PageLayout>{children}</PageLayout>;
  }

  const handleLogout = () => { logoutMutation.mutate(); navigate("/"); };

  const goSection = (s: string) =>
    navigate(s === "home" ? "/account" : `/account?s=${encodeURIComponent(s)}`);

  const navProps = {
    section: active,
    setSection: goSection,
    hubMoreOpen,
    setHubMoreOpen,
    account,
  } as unknown as PortalNavProps;

  return (
    <DashboardShell
      activeSection={active}
      title={SECTION_TITLE[active]}
      username={account?.telegramUsername ?? ""}
      credits={account?.credits ?? null}
      orders={(ordersData ?? []) as DashOrder[]}
      activeCompounds={[]}
      groupBuys={[]}
      onSection={goSection}
      onLogout={handleLogout}
      navProps={navProps}
    >
      {children}
    </DashboardShell>
  );
}
