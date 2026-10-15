import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAccount } from "@/hooks/use-account";
import { displayStage, fetchCustomerUpdates, fetchProgress, gbuKeys, GBU_POLL_MS, staleUserKeys, type GbStage } from "@/lib/group-buy-updates";

/**
 * Drops ONLY the previous user's cached progress/updates when the signed-in user changes.
 * Keys are username-scoped, so the current user's in-flight queries are never touched.
 */
function useAuthScope() {
  const { account, isLoggedIn } = useAccount();
  const user = isLoggedIn && account?.telegramUsername ? account.telegramUsername : null;
  const qc = useQueryClient();
  const prev = useRef(user);
  useEffect(() => {
    const keys = staleUserKeys(prev.current, user);
    prev.current = user;
    for (const k of keys) {
      qc.cancelQueries({ queryKey: k });
      qc.removeQueries({ queryKey: k });
    }
  }, [user, qc]);
  return user;
}

/** One shared query across every card/row. Previous data is kept if a refresh fails. */
export function useGroupBuyProgressMap() {
  const user = useAuthScope();
  const q = useQuery({
    queryKey: gbuKeys.progress(user),
    queryFn: ({ signal }) => fetchProgress(signal),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: GBU_POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  return { ...q, enabled: !!user };
}

/** Undefined while loading or when the first load failed: never shows an Open fallback on error. */
export function useGroupBuyStage(gbId: string, lifecycle?: string | null): { stage: GbStage | undefined; unavailable: boolean } {
  const q = useGroupBuyProgressMap();
  const stage = displayStage({ data: q.data, isLoading: q.isLoading, isError: q.isError, enabled: q.enabled }, gbId, lifecycle);
  return { stage, unavailable: q.isError && !q.data };
}

export function useCustomerGroupBuyUpdates(gbId: string | null) {
  const user = useAuthScope();
  return useQuery({
    queryKey: gbuKeys.customer(user, gbId ?? ""),
    queryFn: ({ signal }) => fetchCustomerUpdates(gbId as string, signal),
    enabled: !!user && !!gbId,
    staleTime: 30_000,
    refetchInterval: GBU_POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
