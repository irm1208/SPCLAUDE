import { useEffect, useRef, useState } from "react";

// ── Janoshik browser-helper receiver ─────────────────────────────────────────
// Opened in a new tab by the admin bookmarklet running on a Janoshik report
// page. The bookmarklet fetches the report image(s) (its browser has already
// passed the Cloudflare challenge) and sends them here via postMessage. This
// page forwards them to the admin import endpoint using the admin secret that
// the bookmarklet carries. No admin login is needed in this tab.

type Status = "waiting" | "importing" | "success" | "error" | "duplicate";

interface HelperPayload {
  type: "janoshik-helper-payload";
  url?: string;
  images: string[]; // data: URLs
  secret: string;
  labName?: string;
  supplier?: string;
  isThirdParty?: boolean;
}

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

export default function JanoshikReceiver() {
  const [status, setStatus] = useState<Status>("waiting");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ id?: number; peptideName?: string; purityPct?: number | null; batchCode?: string | null; duplicateId?: number } | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    async function handlePayload(p: HelperPayload) {
      if (handled.current) return;
      handled.current = true;
      setStatus("importing");
      setMessage("Reading report and extracting data…");

      const blobs = p.images.map(dataUrlToBlob).filter((b): b is Blob => b !== null).slice(0, 6);
      if (blobs.length === 0) {
        setStatus("error");
        setMessage("No readable report image was received.");
        return;
      }

      const fd = new FormData();
      blobs.forEach((b, i) => {
        const ext = b.type === "image/jpeg" ? "jpg" : b.type === "image/webp" ? "webp" : "png";
        fd.append("files", b, `report-${i + 1}.${ext}`);
      });
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
    // Tell the opener (the Janoshik tab) we're ready to receive the report.
    try {
      if (window.opener) window.opener.postMessage({ type: "janoshik-helper-ready" }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const purity = result?.purityPct;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black">S</div>
          <div>
            <p className="text-sm font-bold leading-tight">Salt&amp;Peps</p>
            <p className="text-[11px] text-slate-400 leading-tight">Janoshik report importer</p>
          </div>
        </div>

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
      </div>
    </div>
  );
}
