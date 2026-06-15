import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, FlaskConical } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useCurrency } from "@/hooks/use-currency";
import { useAccount } from "@/hooks/use-account";

interface VialProduct {
  id: string;
  name: string;
  mgSize: string | null;
  price: number;
  currency: string;
  stock: number;
  active: boolean;
}

const C = {
  bg:      "var(--salt-home-content-bg)",
  surface: "var(--t-surface)",
  border:  "var(--t-border)",
  text:    "var(--t-text)",
  muted:   "var(--t-muted)",
  subtle:  "var(--t-subtle)",
  navy:    "var(--t-blue-deep)",
  blue:    "#2563EB",
  green:   "#059669",
};

const SERIF = "var(--font-display)";

const DEFAULT_LANDING_VIS: Record<string, boolean> = {
  announcements: true,
  testing_pools: true,
  vials_in_stock: true,
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { format: fmtPrice } = useCurrency();

  const [products, setProducts] = useState<VialProduct[]>([]);
  const [landingVis, setLandingVis] = useState<Record<string, boolean>>(DEFAULT_LANDING_VIS);
  const [openPoolCount, setOpenPoolCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/vial/products")
      .then(r => r.json())
      .then((data: VialProduct[]) => {
        const active = (Array.isArray(data) ? data : [])
          .filter((p: VialProduct) => p.active && p.stock > 0)
          .sort((a: VialProduct, b: VialProduct) => a.name.localeCompare(b.name))
          .slice(0, 6);
        setProducts(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/testing-pools")
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const open = (data as { status: string }[]).filter(p => p.status === "open").length;
          setOpenPoolCount(open);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/landing-page-sections")
      .then(r => r.json())
      .then((data: { sections?: { id: string; enabled: boolean }[] }) => {
        if (Array.isArray(data.sections)) {
          const vis = { ...DEFAULT_LANDING_VIS };
          for (const s of data.sections) vis[s.id] = s.enabled;
          setLandingVis(vis);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PageLayout>
      <div className="flex-1 overflow-y-auto" style={{ background: C.bg }}>

        {landingVis.announcements && (
          <div className="px-6 pt-4">
            <SiteAnnouncements />
          </div>
        )}

        {/* ── TESTING POOLS ── */}
        {landingVis.testing_pools && (
          <section className="px-6 pt-2 pb-10">
            <div style={{
              padding: "20px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: "rgba(37,99,235,0.10)",
                border: "1px solid rgba(37,99,235,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <FlaskConical style={{ width: "18px", height: "18px", color: C.blue }} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: C.text, marginBottom: "2px" }}>
                  Community Testing Pools
                </p>
                <p style={{ fontSize: "12px", color: C.muted, lineHeight: 1.5 }}>
                  {openPoolCount !== null && openPoolCount > 0
                    ? `${openPoolCount} pool${openPoolCount === 1 ? "" : "s"} currently open for contributions`
                    : "Lab test peptides as a group — split the cost"}
                </p>
              </div>
              <button
                onClick={() => setLocation("/testing-pools")}
                className="transition-opacity hover:opacity-80"
                style={{
                  flexShrink: 0,
                  height: "32px",
                  padding: "0 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: C.navy,
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                View pools
                <ArrowRight style={{ width: "12px", height: "12px" }} strokeWidth={2} />
              </button>
            </div>
          </section>
        )}

        {/* ── SINGLE VIALS IN STOCK ── */}
        {landingVis.vials_in_stock && <section className="px-6 pt-10 pb-12">
          <div style={{ marginBottom: "18px" }}>
            <p style={{
              fontFamily: SERIF,
              fontSize: "20px",
              fontWeight: 400,
              color: C.text,
              marginBottom: "6px",
            }}>
              Single vials — in stock now
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: C.muted, maxWidth: 400 }}>
              Try a compound before committing to a full kit.
            </p>
          </div>

          {products.length > 0 && (
            <div
              className="flex gap-2.5 overflow-x-auto mb-5"
              style={{ scrollbarWidth: "none" }}
            >
              {products.map(p => (
                <div
                  key={p.id}
                  className="flex-shrink-0 flex flex-col"
                  style={{
                    width: 148,
                    padding: "14px",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.3, color: C.text, marginBottom: "2px" }}>
                    {p.name}
                  </p>
                  {p.mgSize && (
                    <p style={{ fontSize: "10.5px", color: C.subtle, marginBottom: "8px" }}>
                      {p.mgSize} mg
                    </p>
                  )}
                  <p style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: C.blue,
                    fontVariantNumeric: "tabular-nums",
                    marginTop: "auto",
                    marginBottom: "10px",
                  }}>
                    {fmtPrice(p.price)}
                  </p>
                  <button
                    onClick={() => setLocation("/shop")}
                    className="transition-opacity hover:opacity-80"
                    style={{
                      width: "100%",
                      height: "28px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: C.navy,
                      color: "#fff",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setLocation("/shop")}
            className="transition-opacity hover:opacity-85"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "36px",
              padding: "0 16px",
              fontSize: "12px",
              fontWeight: 600,
              background: C.navy,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Browse all vials
            <ArrowRight style={{ width: "13px", height: "13px" }} strokeWidth={2} />
          </button>
        </section>}

      </div>
    </PageLayout>
  );
}
