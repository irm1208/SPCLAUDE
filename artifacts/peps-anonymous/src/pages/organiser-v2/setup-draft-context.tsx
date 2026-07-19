import { createContext, useContext, useEffect, type MutableRefObject, type ReactNode } from "react";
import type { SetupDraftSnapshot } from "./setup-draft";

interface SetupDraftContextValue {
  snapshotRef: MutableRefObject<SetupDraftSnapshot>;
}

const SetupDraftContext = createContext<SetupDraftContextValue | null>(null);

export function SetupDraftProvider({
  snapshotRef,
  children,
}: SetupDraftContextValue & { children: ReactNode }) {
  return <SetupDraftContext.Provider value={{ snapshotRef }}>{children}</SetupDraftContext.Provider>;
}

export function useRegisterSetupSection<K extends keyof SetupDraftSnapshot>(
  section: K,
  value: NonNullable<SetupDraftSnapshot[K]>,
) {
  const context = useContext(SetupDraftContext);
  useEffect(() => {
    if (context) context.snapshotRef.current[section] = value;
  }, [context, section, value]);
}

export function useSetupDraftSnapshot(): SetupDraftSnapshot {
  return useContext(SetupDraftContext)?.snapshotRef.current ?? {};
}
