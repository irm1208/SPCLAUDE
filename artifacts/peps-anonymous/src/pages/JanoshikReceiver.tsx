import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SaltPepsMark } from "@/components/SaltPepsMark";

// ── Janoshik browser-helper receiver ─────────────────────────────────────────
// Opened in a new tab by the admin bookmarklet running on a Janoshik report
// page. The bookmarklet's browser has already passed the Cloudflare challenge,
// so it can fetch report images that our server cannot. It sends them here via
// postMessage and this page forwards them to the admin import endpoint using the
// admin secret the bookmarklet carries. No admin login is needed in this tab.
//
// Two modes:
//  • single  (default)        — imports the one report the admin is looking at.
//  • bulk    (?mode=bulk)      — the admin pastes a list of report URLs; this
//                               page drives the Janoshik tab to fetch each one
//                               in turn and imports them with throttling.

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [head, body] = dataUrl.split(",");
    if (!head || !body) return null;
    const mimeMatch = /data:([^;]+)/.exec(head);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function blobsFromDataUrls(images: string[]): Blob[] {
  return images.map(dataUrlToBlob).filter((b): b is Blob => b !== null).slice(0, 6);
}

function extFor(blob: Blob): string {
  return blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Single-report mode (original one-click importer) ─────────────────────────

type SingleStatus = "waiting" | "importing" | "success" | "error" | "duplicate";

interface HelperPayload {
  type: "janoshik-helper-payload";
  url?: string;
  images: string[]; // data: URLs
  secret: string;
  labName?: string;
  supplier?: string;
  isThirdParty?: boolean;
}

function SingleReceiver() {
  const [status, setStatus] = useState<SingleStatus>("waiting");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ id?: number; peptideName?: string; purityPct?: number | null; batchCode?: string | null; duplicateId?: number } | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    async function handlePayload(p: HelperPayload) {
      if (handled.current) return;
      handled.current = true;
      setStatus("importing");
      setMessage("Reading report and extracting data…");

      const blobs = blobsFromDataUrls(p.images);
      if (blobs.length === 0) {
        setStatus("error");
        setMessage("No readable report image was received.");
        return;
      }

      const fd = new FormData();
      blobs.forEach((b, i) => fd.append("files", b, `report-${i + 1}.${extFor(b)}`));
      if (p.url) fd.append("url", p.url);
      if (p.labName) fd.append("labName", p.labName);
      if (p.supplier) fd.append("supplier", p.supplier);
      if (p.isThirdParty) fd.append("isThirdParty", "true");

      try {
        const res = await fetch("/api/admin/lab-tests/bookmarklet-import", {
          method: "POST",
          headers: { "x-admin-secret": p.secret },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
          setResult(data);
          setMessage("Imported successfully.");
        } else if (res.status === 409) {
          setStatus("duplicate");
          setResult(data);
          setMessage(data?.error || "This report was already imported.");
        } else if (res.status === 401) {
          setStatus("error");
          setMessage("Your admin key was not accepted. Re-create the import button from the admin panel.");
        } else {
          setStatus("error");
          setMessage(data?.error || `Import failed (HTTP ${res.status}).`);
        }
      } catch (err) {
        setStatus("error");
        setMessage("Could not reach the server. Check your connection and try again.");
        console.error("[janoshik-receiver]", err);
      }
    }

    function onMessage(e: MessageEvent) {
      // Only accept the payload from the window that opened us (the bookmarklet's
      // Janoshik tab). This blocks arbitrary pages/iframes from poking the
      // importer. The admin secret inside the payload is still what authorizes.
      if (!window.opener || e.source !== window.opener) return;
      const d = e.data as HelperPayload | undefined;
      if (!d || d.type !== "janoshik-helper-payload" || !Array.isArray(d.images) || !d.secret) return;
      void handlePayload(d);
    }

    window.addEventListener("message", onMessage);
    try {
      if (window.opener) window.opener.postMessage({ type: "janoshik-helper-ready" }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const purity = result?.purityPct;

  return (
    <Shell subtitle="Janoshik report importer">
      {status === "waiting" && (
        <div className="text-center py-6">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="text-sm font-semibold">Waiting for the report…</p>
          <p className="mt-2 text-xs text-slate-400">
            Go to a Janoshik report and click your <span className="font-semibold text-slate-200">Import to Salt&amp;Peps</span> button.
            This tab will fill in automatically.
          </p>
        </div>
      )}

      {status === "importing" && (
        <div className="text-center py-6">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="text-sm font-semibold">Importing…</p>
          <p className="mt-2 text-xs text-slate-400">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-4">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center text-2xl">✓</div>
          <p className="text-base font-bold text-green-400">Report imported!</p>
          <div className="mt-4 rounded-lg bg-slate-800/60 p-4 text-left text-sm">
            <p className="font-semibold">{result?.peptideName ?? "Unknown compound"}</p>
            <div className="mt-1 space-y-0.5 text-xs text-slate-400">
              {purity != null && <p>Purity: <span className="text-slate-200 font-medium">{purity}%</span></p>}
              {result?.batchCode && <p>Batch: <span className="text-slate-200 font-medium">{result.batchCode}</span></p>}
            </div>
          </div>
          <a href="/tests" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500">
            View lab tests
          </a>
          <p className="mt-3 text-[11px] text-slate-500">You can close this tab and import the next report.</p>
        </div>
      )}

      {status === "duplicate" && (
        <div className="text-center py-4">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center text-2xl">!</div>
          <p className="text-base font-bold text-amber-400">Already imported</p>
          <p className="mt-2 text-xs text-slate-400">{message}</p>
          <p className="mt-3 text-[11px] text-slate-500">You can close this tab.</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-4">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-red-500/15 flex items-center justify-center text-2xl">×</div>
          <p className="text-base font-bold text-red-400">Import failed</p>
          <p className="mt-2 text-xs text-slate-400">{message}</p>
          <p className="mt-3 text-[11px] text-slate-500">Close this tab and try again from the Janoshik report.</p>
        </div>
      )}
    </Shell>
  );
}

// ── Bulk mode ────────────────────────────────────────────────────────────────

type RowStatus = "queued" | "fetching" | "importing" | "imported" | "duplicate" | "failed";

interface Row {
  url: string;
  status: RowStatus;
  detail?: string;
}

interface BulkReply {
  type: "janoshik-bulk-image" | "janoshik-bulk-error";
  runId?: string;
  reqId?: string;
  url?: string;
  images?: string[];
  reason?: string;
}

const ROW_META: Record<RowStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "text-slate-500" },
  fetching: { label: "Fetching…", cls: "text-sky-400" },
  importing: { label: "Importing…", cls: "text-indigo-400" },
  imported: { label: "Imported", cls: "text-green-400" },
  duplicate: { label: "Already on file", cls: "text-amber-400" },
  failed: { label: "Failed", cls: "text-red-400" },
};

function BulkReceiver() {
  const [connected, setConnected] = useState(false);
  const [urlsText, setUrlsText] = useState("");
  const [delaySec, setDelaySec] = useState(2);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const secretRef = useRef("");
  const openerOriginRef = useRef("");
  const runIdRef = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36));
  const pendingRef = useRef<{ reqId: string; resolve: (v: BulkReply) => void } | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Messages must come from the Janoshik tab that opened us.
      if (!window.opener || e.source !== window.opener) return;
      const d = e.data as { type?: string; secret?: string } & BulkReply;
      if (!d || typeof d.type !== "string") return;

      if (d.type === "janoshik-bulk-hello" && typeof d.secret === "string" && d.secret) {
        secretRef.current = d.secret;
        openerOriginRef.current = e.origin;
        setConnected(true);
        // Acknowledge so the worker stops re-sending hello and learns our runId.
        try {
          (window.opener as Window).postMessage({ type: "janoshik-bulk-ack", runId: runIdRef.current }, e.origin);
        } catch {
          /* ignore */
        }
        return;
      }

      if ((d.type === "janoshik-bulk-image" || d.type === "janoshik-bulk-error") && d.runId === runIdRef.current) {
        const p = pendingRef.current;
        if (p && p.reqId === d.reqId) {
          pendingRef.current = null;
          p.resolve(d);
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Ask the Janoshik tab to fetch one report; resolves with image data or error.
  const askWorker = useCallback((url: string) => {
    return new Promise<BulkReply>((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const timeout = window.setTimeout(() => {
        if (pendingRef.current?.reqId === reqId) {
          pendingRef.current = null;
          resolve({ type: "janoshik-bulk-error", url, reason: "Timed out waiting for the Janoshik tab (60s)." });
        }
      }, 60000);
      pendingRef.current = {
        reqId,
        resolve: (v) => {
          window.clearTimeout(timeout);
          resolve(v);
        },
      };
      try {
        (window.opener as Window).postMessage(
          { type: "janoshik-bulk-fetch", runId: runIdRef.current, reqId, url },
          openerOriginRef.current || "*",
        );
      } catch {
        window.clearTimeout(timeout);
        pendingRef.current = null;
        resolve({ type: "janoshik-bulk-error", url, reason: "Lost connection to the Janoshik tab." });
      }
    });
  }, []);

  const importOne = useCallback(async (url: string, images: string[]): Promise<{ status: RowStatus; detail: string }> => {
    const blobs = blobsFromDataUrls(images);
    if (blobs.length === 0) return { status: "failed", detail: "No readable image received." };
    const fd = new FormData();
    blobs.forEach((b, i) => fd.append("files", b, `report-${i + 1}.${extFor(b)}`));
    fd.append("url", url);
    const res = await fetch("/api/admin/lab-tests/bookmarklet-import", {
      method: "POST",
      headers: { "x-admin-secret": secretRef.current },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const name = data?.peptideName || "";
      if (data?.backfilled) return { status: "imported", detail: name ? `Certificate saved · ${name}` : "Certificate saved" };
      return { status: "imported", detail: name };
    }
    if (res.status === 409) return { status: "duplicate", detail: data?.error || "Already imported." };
    if (res.status === 401) return { status: "failed", detail: "Admin key rejected — re-create the button." };
    return { status: "failed", detail: data?.error || `Import failed (HTTP ${res.status}).` };
  }, []);

  const setRow = useCallback((i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }, []);

  const start = useCallback(async () => {
    const urls = Array.from(
      new Set(urlsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)),
    );
    if (urls.length === 0 || !connected) return;

    stopRef.current = false;
    setDone(false);
    setRunning(true);
    setRows(urls.map((u) => ({ url: u, status: "queued" as RowStatus })));

    for (let i = 0; i < urls.length; i++) {
      if (stopRef.current) {
        setRows((prev) => prev.map((r) => (r.status === "queued" ? { ...r, status: "failed", detail: "Stopped." } : r)));
        break;
      }
      const url = urls[i];
      setRow(i, { status: "fetching", detail: undefined });

      const reply = await askWorker(url);
      if (reply.type === "janoshik-bulk-error") {
        setRow(i, { status: "failed", detail: reply.reason || "Could not fetch the report." });
      } else {
        setRow(i, { status: "importing" });
        try {
          const out = await importOne(url, reply.images || []);
          setRow(i, { status: out.status, detail: out.detail });
        } catch {
          setRow(i, { status: "failed", detail: "Could not reach the server." });
        }
      }

      if (i < urls.length - 1 && !stopRef.current) {
        await sleep(Math.max(0, delaySec * 1000) + Math.random() * 800);
      }
    }

    setRunning(false);
    setDone(true);
  }, [urlsText, connected, delaySec, askWorker, importOne, setRow]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const counts = useMemo(() => {
    const c = { imported: 0, duplicate: 0, failed: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "imported") c.imported++;
      else if (r.status === "duplicate") c.duplicate++;
      else if (r.status === "failed") c.failed++;
    }
    return c;
  }, [rows]);

  const processed = counts.imported + counts.duplicate + counts.failed;
  const failedUrls = useMemo(() => rows.filter((r) => r.status === "failed").map((r) => r.url), [rows]);

  const copyFailed = useCallback(() => {
    void navigator.clipboard?.writeText(failedUrls.join("\n"));
  }, [failedUrls]);

  return (
    <Shell subtitle="Bulk Janoshik importer" wide>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-slate-600 animate-pulse"}`}
          />
          <span className={connected ? "text-green-400 font-semibold" : "text-slate-400"}>
            {connected ? "Connected to your Janoshik tab" : "Connecting to your Janoshik tab…"}
          </span>
        </div>

        {!connected && (
          <p className="text-xs text-slate-400">
            Keep this tab open. If nothing connects, go back to your Janoshik tab and click the
            <span className="font-semibold text-slate-200"> Bulk import</span> button again.
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Report links (one per line)</label>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            disabled={running}
            rows={6}
            placeholder={"https://janoshik.com/tests/....\nhttps://janoshik.com/tests/...."}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-400">
            Pause between reports:
            <input
              type="number"
              min={0}
              max={30}
              value={delaySec}
              disabled={running}
              onChange={(e) => setDelaySec(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              className="ml-2 w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-60"
            />
            <span className="ml-1">sec</span>
          </label>

          {!running ? (
            <button
              onClick={() => void start()}
              disabled={!connected || urlsText.trim().length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {done ? "Run again" : "Start import"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-lg bg-red-600/90 px-4 py-2 text-sm font-bold hover:bg-red-500"
            >
              Stop
            </button>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-300 font-semibold">{processed} / {counts.total}</span>
              <span className="text-green-400">{counts.imported} imported</span>
              <span className="text-amber-400">{counts.duplicate} already on file</span>
              <span className="text-red-400">{counts.failed} failed</span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/70">
              {rows.map((r, i) => {
                const meta = ROW_META[r.status];
                return (
                  <div key={`${r.url}-${i}`} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-slate-400" title={r.url}>{r.url}</p>
                      {r.detail && <p className="truncate text-[11px] text-slate-500" title={r.detail}>{r.detail}</p>}
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {done && (
          <div className="rounded-lg bg-slate-800/60 p-4 text-sm">
            <p className="font-bold text-slate-100">Finished</p>
            <p className="mt-1 text-xs text-slate-400">
              {counts.imported} imported · {counts.duplicate} already on file · {counts.failed} failed.
            </p>
            {failedUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={copyFailed} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600">
                  Copy failed links
                </button>
                <span className="text-[11px] text-slate-500">Paste them back above and run again to retry.</span>
              </div>
            )}
            <a href="/tests" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500">
              View lab tests
            </a>
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Keep both this tab and the Janoshik tab open while importing, and stop your computer from sleeping.
          Reports are fetched one at a time with a short pause so Janoshik doesn't block your session.
        </p>
      </div>
    </Shell>
  );
}

// ── Shared shell ─────────────────────────────────────────────────────────────

function Shell({ children, subtitle, wide }: { children: React.ReactNode; subtitle: string; wide?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl`}>
        <div className="flex items-center gap-2 mb-5">
          <div
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, background: "#1B3A7A" }}
          >
            <SaltPepsMark size={26} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Salt&amp;Peps</p>
            <p className="text-[11px] text-slate-400 leading-tight">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function JanoshikReceiver() {
  const isBulk = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "bulk";
  return isBulk ? <BulkReceiver /> : <SingleReceiver />;
}
