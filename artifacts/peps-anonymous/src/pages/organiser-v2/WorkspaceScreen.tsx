import type { ReactNode } from "react";
import type { WorkspaceTabId } from "./nav";
import { WORKSPACE_PAGE_META } from "./nav";
import { PageHeader } from "./OrganiserUi";
import {
  WORKSPACE_PAGE_TREATMENT,
  workspaceUsesSharedHeader,
} from "./workspace-theme";

export default function WorkspaceScreen({
  pageId,
  children,
}: {
  pageId: WorkspaceTabId;
  children: ReactNode;
}) {
  const needsOuterHeader = workspaceUsesSharedHeader(pageId);
  const pageMeta = WORKSPACE_PAGE_META[pageId];

  return (
    <section
      className="ov2-page ov2-workspace-screen"
      data-page={pageId}
      data-treatment={WORKSPACE_PAGE_TREATMENT[pageId]}
      data-atlas-root="true"
    >
      {needsOuterHeader ? (
        <PageHeader title={pageMeta.title} description={pageMeta.description} />
      ) : null}
      {children}
    </section>
  );
}
