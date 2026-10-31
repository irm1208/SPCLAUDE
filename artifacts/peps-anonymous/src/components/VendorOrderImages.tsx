import { vendorTranslate as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { useEffect, useState } from "react";
import { ImageIcon, AlertTriangle } from "lucide-react";

export interface VendorImage { id: string; filename: string; url: string; createdAt: string }

export function VendorOrderImages({ orderId }: { orderId: string }) {
  useVendorLanguage();
  const [images, setImages] = useState<VendorImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/account/orders/${encodeURIComponent(orderId)}/vendor-images`, { credentials: "include" })
      .then(async r => {
        if (!r.ok) throw new Error((getVendorLanguage() === "zh" ? `无法加载履约照片（${r.status}）` : `Could not load fulfilment photos (${r.status})`));
        const body = await r.json().catch(() => ({}));
        if (!cancelled) setImages(Array.isArray(body?.images) ? body.images : []);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : vt("Could not load fulfilment photos")); });
    return () => { cancelled = true; };
  }, [orderId, nonce]);

  if (error) {
    return (
      <div role="alert" data-testid="vendor-images-error" className="rounded-xl p-3 text-xs flex items-center gap-2" style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#DC2626" }}>
        <AlertTriangle className="w-4 h-4 shrink-0" />{vt(error)}
        <button type="button" className="ml-auto font-bold underline" onClick={() => setNonce(n => n + 1)} data-testid="button-retry-vendor-images">{vt("Retry")}</button>
      </div>
    );
  }
  if (images === null) return <div className="h-20 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} data-testid="vendor-images-loading" />;
  if (images.length === 0) return null;

  return (
    <section aria-label={vt("Fulfilment photos")} data-testid="vendor-images">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
        <ImageIcon className="w-3.5 h-3.5" /> {vt("Fulfilment photos")} </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map(img => (
          <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden" style={{ border: "1px solid var(--t-border)" }} data-testid={`link-vendor-image-${img.id}`}>
            <img src={img.url} alt={img.filename} loading="lazy" className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}
