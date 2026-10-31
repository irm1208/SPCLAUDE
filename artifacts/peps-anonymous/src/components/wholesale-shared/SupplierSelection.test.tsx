import { JSDOM } from "jsdom";
import { afterEach, expect, it } from "vitest";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { SupplierSelection } = await import("./SupplierSelection");
afterEach(() => { document.body.innerHTML = ""; });

it("lets the organiser choose either supplier or both and warns about an empty selection", async () => {
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el);
  let ids = ["a", "b"];
  function Fixture() {
    const [selected, setSelected] = React.useState(ids);
    return <SupplierSelection vendors={[{ id: "a", name: "Uther" }, { id: "b", name: "JBG/YT" }]}
      selected={selected} onChange={value => { ids = value; setSelected(value); }} />;
  }
  try {
    await React.act(async () => root.render(<Fixture />));
    const inputs = el.querySelectorAll<HTMLInputElement>("input");
    await React.act(async () => inputs[1].click());
    expect(ids).toEqual(["a"]);
    await React.act(async () => inputs[0].click());
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Select at least one");
    await React.act(async () => inputs[1].click());
    expect(ids).toEqual(["b"]);
    await React.act(async () => el.querySelector("button")!.click());
    expect(ids).toEqual(["a", "b"]);
    expect(el.textContent).toContain("Each supplier has its own shipping charge");
  } finally { await React.act(async () => root.unmount()); }
});
