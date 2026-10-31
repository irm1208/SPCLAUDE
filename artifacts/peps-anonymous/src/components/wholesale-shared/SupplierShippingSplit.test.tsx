import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { SupplierShippingSplit } = await import("./SupplierShippingSplit");

it("provides independent supplier rules and presets for separate or combined shipping", async () => {
  const el = document.createElement("div"); const root = createRoot(el);
  let rules: Record<string, "buyers" | "all_members"> = {};
  function Fixture() {
    const [value, setValue] = React.useState(rules);
    return <SupplierShippingSplit vendors={[{ id: "a", name: "Uther" }, { id: "b", name: "JBG/YT" }]}
      rules={value} onChange={next => { rules = next; setValue(next); }} />;
  }
  try {
    await React.act(async () => root.render(<Fixture />));
    const selects = el.querySelectorAll("select");
    expect(selects[0].value).toBe("buyers");
    await React.act(async () => {
      selects[1].value = "all_members";
      selects[1].dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    expect(rules).toEqual({ b: "all_members" });
    await React.act(async () => el.querySelectorAll("button")[1].click());
    expect(rules).toEqual({ a: "all_members", b: "all_members" });
    await React.act(async () => el.querySelectorAll("button")[0].click());
    expect(rules).toEqual({ a: "buyers", b: "buyers" });
    expect(el.textContent).toContain("Members without items are not charged");
  } finally { await React.act(async () => root.unmount()); }
});
