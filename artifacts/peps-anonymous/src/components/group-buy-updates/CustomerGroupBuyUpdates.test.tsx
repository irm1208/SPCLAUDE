import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  data: { stage: "in_transit", stageUpdatedAt: null, updates: [] },
}));
vi.mock("@/hooks/use-group-buy-progress", () => ({
  useCustomerGroupBuyUpdates: () => ({ data: state.data, isError: false, isFetching: false }),
}));

import { CustomerGroupBuyUpdates } from "./CustomerGroupBuyUpdates";

describe("customer group-buy progress disclosure", () => {
  it("starts minimized but keeps the current stage visible in its summary", () => {
    const html = renderToStaticMarkup(<CustomerGroupBuyUpdates gbId="group" enabled />);
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(html).toContain("<summary");
    expect(html).toContain("Group buy progress");
    expect(html).toContain("In transit");
    expect(html).toContain("View");
  });
  it("retains the progress anchor and tracker inside the expandable content", () => {
    const html = renderToStaticMarkup(<CustomerGroupBuyUpdates gbId="group" enabled />);
    expect(html).toContain('id="group-buy-updates"');
    expect(html).toContain('data-testid="gb-progress-tracker"');
  });
  it("stays hidden when member access is disabled", () => {
    expect(renderToStaticMarkup(<CustomerGroupBuyUpdates gbId="group" enabled={false} />)).toBe("");
  });
});
