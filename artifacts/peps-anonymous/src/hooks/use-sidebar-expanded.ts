import { createContext, useContext } from "react";

export const SidebarExpandedCtx = createContext(false);
export function useSidebarExpanded() { return useContext(SidebarExpandedCtx); }
