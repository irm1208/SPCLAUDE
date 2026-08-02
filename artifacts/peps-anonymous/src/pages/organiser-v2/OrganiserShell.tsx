import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { V2_VARS } from "./theme";

export interface OrganiserShellNavigationControls {
  onOpenDrawer: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function OrganiserShell({
  sidebar,
  topbar,
  mobileNavigation,
  children,
}: {
  sidebar: (onNavigate: () => void, onCollapse: () => void, collapsed: boolean) => ReactNode;
  topbar: (navigation: OrganiserShellNavigationControls) => ReactNode;
  mobileNavigation?: (onOpenMenu: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const openNavigation = () => setMobileOpen(true);
  const closeNavigation = () => setMobileOpen(false);

  return (
    <div className={collapsed ? "organiser-v2 ov2-shell is-sidebar-collapsed" : "organiser-v2 ov2-shell"}>
      <a href="#ov2-main-content" className="ov2-skip-link">Skip to main content</a>

      <aside className="ov2-sidebar-desktop" aria-label="Organiser navigation">
        {sidebar(() => undefined, () => setCollapsed(value => !value), collapsed)}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="organiser-v2 ov2-sidebar-drawer p-0"
          style={V2_VARS}
          aria-label="Mobile organiser navigation"
        >
          <SheetTitle className="sr-only">Organiser navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a destination in the active group buy.
          </SheetDescription>
          {sidebar(closeNavigation, () => undefined, false)}
        </SheetContent>
      </Sheet>

      <div className="ov2-main">
        {topbar({
          onOpenDrawer: openNavigation,
          onToggleSidebar: () => setCollapsed(value => !value),
          sidebarCollapsed: collapsed,
        })}
        <main id="ov2-main-content" tabIndex={-1}>{children}</main>
        {mobileNavigation?.(openNavigation)}
      </div>
    </div>
  );
}
