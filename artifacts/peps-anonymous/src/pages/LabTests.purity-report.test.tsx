import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
vi.mock("@/components/PageLayout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/SiteAnnouncements", () => ({ SiteAnnouncements: () => null }));
const { ReportModal } = await import("./LabTests");

it.each([[95, "Good", "#059669"], [95.696, "Good", "#059669"], [94.999, "Low", "#DC2626"]])(
  "renders the actual HGH 36IU report viewer at %s%% with the correct badge and value colour",
  (purityPct, label, colour) => {
    const test = { id: 1461, peptideName: "HGH 36IU", nominalDose: "36IU", purityPct,
      supplier: "Salt&Peps", batchCode: "GH36-09", labName: "Janoshik",
      testDate: "2026-10-07", createdAt: "2026-10-07", url: "https://example.com/report",
      sterilityPass: null, endotoxinEuMg: null, mgAmount: 12.635, massUnit: "mg",
      isThirdPartyTest: false, janoshikId: "239562", testType: null,
      productCategory: null, notes: null, heavyMetalAs: null, heavyMetalCd: null,
      heavyMetalPb: null, heavyMetalHg: null, blendComponents: null };
    const markup = renderToStaticMarkup(<ReportModal tests={[test]} index={0} onClose={() => {}} onChangeIndex={() => {}} />);
    expect(markup).toContain(`— ${label}`);
    expect(markup).toContain(`color:${colour}`);
    expect(markup).not.toContain(`— ${label === "Good" ? "Low" : "Good"}`);
    // The numeric purity value must not independently fall back to the 98% rule.
    const dom = new JSDOM(markup);
    const value = dom.window.document.querySelector("span.text-sm.font-bold");
    expect(value?.getAttribute("style")).toContain(`color:${colour}`);
    dom.window.close();
  },
);
