import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CompoundLog {
  id: string;
  telegramUsername: string;
  compoundName: string;
  compoundType: string;
  doseAmount: string;
  doseUnit: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateCompoundPayload {
  compoundName: string;
  compoundType: string;
  doseAmount: number;
  doseUnit: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface UpdateCompoundPayload {
  id: string;
  compoundName?: string;
  compoundType?: string;
  doseAmount?: number;
  doseUnit?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useCompounds(enabled = true) {
  return useQuery<CompoundLog[]>({
    queryKey: ["compounds"],
    queryFn: () => apiFetch<CompoundLog[]>("/api/compounds"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCreateCompound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompoundPayload) =>
      apiFetch<CompoundLog>("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compounds"] }),
  });
}

export function useUpdateCompound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCompoundPayload) =>
      apiFetch<CompoundLog>(`/api/compounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compounds"] }),
  });
}

export function useDeleteCompound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/compounds/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compounds"] }),
  });
}
