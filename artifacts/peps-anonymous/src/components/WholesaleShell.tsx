import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell, type DashOrder } from "@/components/DashboardShell";
import { useAccount, useLogout, useAccountOrders } from "@/hooks/use-account";
import type { PortalNavProps } from "@/pages/CustomerPortal";

type WholesaleSection = "order" | "shared";

export function WholesaleShell({ active, title, children }: {
  active: WholesaleSection;
  title: string;
  children: React.ReactNode;
}) {
  const [, navigate] = useLocation();
  const { account, isLoggedIn } = useAccount();
  const { data: ordersData } = useAccountOrders(null, isLoggedIn);
  const logoutMutation = useLogout();
  const [hubMoreOpen, setHubMoreOpen] = useState(false);
  const handleLogout = () => { logoutMutation.mutate(); navigate("/"); };

  const activeSection = active === "order" ? "wholesale" : "shared-orders";
  const goSection = (s: string) =>
    navigate(s === "home" ? "/account" : `/account?s=${encodeURIComponent(s)}`);

  const navProps = {
    section: activeSection,
    setSection: goSection,
    hubMoreOpen,
    setHubMoreOpen,
    account,
  } as unknown as PortalNavProps;

  return (
    <DashboardShell
      activeSection={activeSection}
      title={title}
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
