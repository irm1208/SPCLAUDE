import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Glp1Log {
  id: string;
  telegramUsername: string;
  loggedDate: string;
  compoundName: string;
  doseMg: string;
  weightKg: string | null;
  weightUnit: string;
  notes: string | null;
  injectionSite: string | null;
  sideEffects: string | null; // JSON string array e.g. '["nausea","fatigue"]'
  calories: string | null;
  proteinG: string | null;
  waterMl: string | null;
  createdAt: string;
}

export interface CreateGlp1Payload {
  loggedDate: string;
  compoundName: string;
  doseMg: number;
  weightKg?: number | null;
  weightUnit?: string;
  notes?: string | null;
  injectionSite?: string | null;
  sideEffects?: string[] | null;
  calories?: number | null;
  proteinG?: number | null;
  waterMl?: number | null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useGlp1Logs(enabled = true) {
  return useQuery<Glp1Log[]>({
    queryKey: ["glp1"],
    queryFn: () => apiFetch<Glp1Log[]>("/api/glp1"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCreateGlp1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGlp1Payload) =>
      apiFetch<Glp1Log>("/api/glp1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["glp1"] }),
  });
}

export function useDeleteGlp1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/glp1/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["glp1"] }),
  });
}
