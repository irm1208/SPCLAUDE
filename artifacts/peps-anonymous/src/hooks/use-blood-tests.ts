import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BloodTestValue {
  id: string;
  sessionId: string;
  biomarkerName: string;
  biomarkerCategory: string;
  value: string;
  unit: string;
  refRangeLow: string | null;
  refRangeHigh: string | null;
}

export interface BloodTestSession {
  id: string;
  telegramUsername: string;
  testDate: string;
  labName: string | null;
  testName: string | null;
  measurementType: string | null;
  medicationNotes: string | null;
  notes: string | null;
  createdAt: string;
  values: BloodTestValue[];
}

export interface CreateBloodTestPayload {
  testDate: string;
  labName?: string;
  testName?: string;
  measurementType?: string;
  medicationNotes?: string;
  notes?: string;
  values: {
    biomarkerName: string;
    biomarkerCategory: string;
    value: number;
    unit: string;
    refRangeLow?: number | null;
    refRangeHigh?: number | null;
  }[];
}

export interface DiscussSource {
  label: string;
  url: string;
  type: "study" | "forum" | "other";
}

export interface DiscussMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  contextSession?: { id: string; testName: string; testDate: string } | null;
  timestamp: Date;
  chips?: string[];
  sources?: DiscussSource[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useBloodTests(enabled = true) {
  return useQuery<BloodTestSession[]>({
    queryKey: ["blood-tests"],
    queryFn: () => apiFetch<BloodTestSession[]>("/api/blood-tests"),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCreateBloodTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBloodTestPayload) =>
      apiFetch<BloodTestSession>("/api/blood-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blood-tests"] });
    },
  });
}

export function useDeleteBloodTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<{ ok: boolean }>(`/api/blood-tests/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blood-tests"] });
    },
  });
}

export interface UpdateBloodTestPayload {
  testDate?: string;
  labName?: string;
  testName?: string;
  measurementType?: string;
  medicationNotes?: string;
  notes?: string;
  values: {
    biomarkerName: string;
    biomarkerCategory: string;
    value: number;
    unit: string;
    refRangeLow?: number | null;
    refRangeHigh?: number | null;
  }[];
}

export function useUpdateBloodTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: UpdateBloodTestPayload }) =>
      apiFetch<BloodTestSession>(`/api/blood-tests/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blood-tests"] });
    },
  });
}

export interface DiscussResponse {
  response: string;
  contextSession: { id: string; testName: string; testDate: string } | null;
  used: number;
  limit: number;
  chips?: string[];
  sources?: DiscussSource[];
}

async function apiFetchDiscuss(path: string, options?: RequestInit): Promise<DiscussResponse> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    const parsed = err as { error?: string; used?: number; limit?: number };
    if (parsed.error === "limit_reached") {
      const limitErr = new Error("limit_reached") as Error & { used: number; limit: number };
      limitErr.used = parsed.used ?? 5;
      limitErr.limit = parsed.limit ?? 5;
      throw limitErr;
    }
    throw new Error(parsed.error ?? "Request failed");
  }
  return res.json() as Promise<DiscussResponse>;
}

export function useBloodTestDiscuss() {
  return useMutation({
    mutationFn: ({ message, sessionId, history }: {
      message: string;
      sessionId?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    }) =>
      apiFetchDiscuss("/api/blood-tests/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId, history }),
      }),
  });
}
