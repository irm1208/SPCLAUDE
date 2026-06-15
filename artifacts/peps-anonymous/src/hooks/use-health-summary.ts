import { useQuery } from "@tanstack/react-query";

export interface BiomarkerSummary {
  name: string;
  category: string;
  value: number | null;
  unit: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  status: "in_range" | "borderline" | "out_of_range" | "no_range";
  trend: "up" | "down" | "stable";
  latestDate: string;
  previousValue: number | null;
  previousDate: string | null;
}

export interface AdviceCard {
  id: string;
  marker: string;
  headline: string;
  body: string;
  severity: "info" | "warning" | "caution";
  relatedCompounds: string[];
}

export interface HealthSummary {
  biomarkers: BiomarkerSummary[];
  adviceCards: AdviceCard[];
  testingSchedule: string[];
  activeCompounds: string[];
  lastTestDate: string | null;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useHealthSummary(enabled = true) {
  return useQuery<HealthSummary>({
    queryKey: ["health-summary"],
    queryFn: () => apiFetch<HealthSummary>("/api/account/health-summary"),
    staleTime: 3 * 60 * 1000,
    retry: false,
    enabled,
  });
}
