import { useQuery } from "@tanstack/react-query";
import { fetchHalfKitAvailability, HALF_KIT_POLL_MS } from "@/lib/half-kit-api";

export function useHalfKitAvailability(enabled: boolean) {
  return useQuery({
    queryKey: ["account", "half-kit-availability"],
    queryFn: fetchHalfKitAvailability,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: HALF_KIT_POLL_MS,
  });
}
