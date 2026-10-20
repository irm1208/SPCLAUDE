import { useCallback, useEffect, useRef, useState } from "react";
import type { PayoutData, PayoutFetcher } from "../../lib/reshipper-payouts";
import { readError } from "./money";

export function usePayoutData(base: string | null, fetcher: PayoutFetcher) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [data, setData] = useState<PayoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    setData(null); setError(null);
    if (!base) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetcherRef.current(base, { signal: ctrl.signal })
      .then(async res => {
        if (!res.ok) throw new Error(await readError(res));
        const json = await res.json() as PayoutData;
        if (!ctrl.signal.aborted) setData(json);
      })
      .catch(e => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Could not load payouts"); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [base, nonce]);

  /** Performs a write; resolves on success with refreshed data, throws Error(message) on failure. */
  const write = useCallback(async (suffix: string, body: unknown): Promise<PayoutData> => {
    const target = baseRef.current;
    if (!target) throw new Error("No group buy selected");
    const res = await fetcherRef.current(target + suffix, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readError(res));
    const json = await res.json() as PayoutData;
    if (baseRef.current === target) setData(json);
    return json;
  }, []);

  return { data, error, loading, retry: () => setNonce(n => n + 1), write };
}
