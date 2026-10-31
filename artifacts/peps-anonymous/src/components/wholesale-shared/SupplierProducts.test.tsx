// @ts-expect-error The existing test harness provides jsdom without its declaration package.
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { SupplierProductBrowser, SupplierItemGroups } = await import("./SupplierProducts");
const vendors = [{ id: "u", name: "Uther" }, { id: "j", name: "JBG/YT" }];
const products = [
  { id: "u1", name: "Retatrutide", vendorId: "u", vendorName: "Uther" },
  { id: "u2", name: "Tirzepatide", vendorId: "u", vendorName: "Uther" },
  { id: "j1", name: "Retatrutide", vendorId: "j", vendorName: "JBG/YT" },
];

async function mounted(run: (container: HTMLDivElement, root: ReturnType<typeof createRoot>) => Promise<void>) {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try { await run(container, root); }
  finally { await React.act(async () => root.unmount()); container.remove(); }
}

it("switches catalogues without losing either supplier's basket or changing saved quantities", async () => {
  await mounted(async (container, root) => {
    let saved: Record<string, number> = {};
    function Fixture() {
      const [quantities, setQuantities] = React.useState<Record<string, number>>({});
      const [search, setSearch] = React.useState("");
      return <>
        <SupplierProductBrowser products={products} vendors={vendors} search={search} onSearchChange={setSearch} quantities={quantities}
          renderProduct={product => <button data-product={product.id} onClick={() => setQuantities(previous => ({ ...previous, [product.id]: (previous[product.id] ?? 0) + 1 }))}>
            {product.name}: {quantities[product.id] ?? 0}
          </button>} />
        <button data-save onClick={() => { saved = { ...quantities }; }}>Save all</button>
      </>;
    }
    await React.act(async () => root.render(<Fixture />));
    expect(container.querySelector('[data-product="j1"]')).toBeNull();
    await React.act(async () => container.querySelector<HTMLButtonElement>('[data-product="u1"]')!.click());
    await React.act(async () => container.querySelectorAll<HTMLButtonElement>('[aria-pressed]')[1].click());
    expect(container.querySelector('[data-product="u1"]')).toBeNull();
    expect(container.querySelector('[data-product="j1"]')).not.toBeNull();
    await React.act(async () => container.querySelector<HTMLButtonElement>('[data-product="j1"]')!.click());
    await React.act(async () => container.querySelectorAll<HTMLButtonElement>('[aria-pressed]')[0].click());
    expect(container.querySelector('[data-product="u1"]')?.textContent).toContain(": 1");
    await React.act(async () => container.querySelector<HTMLButtonElement>('[data-save]')!.click());
    expect(saved).toEqual({ u1: 1, j1: 1 });
    expect(container.querySelectorAll('[aria-label="1 kits selected"]')).toHaveLength(2);
  });
});

it("searches inside the active supplier and keeps the search when switching", async () => {
  await mounted(async (container, root) => {
    await React.act(async () => root.render(<SupplierProductBrowser products={products} vendors={vendors}
      search="Tirz" onSearchChange={() => {}} quantities={{}} renderProduct={product => <p data-product={product.id}>{product.name}</p>} />));
    expect(container.querySelector('[data-product="u2"]')).not.toBeNull();
    expect(container.querySelector('[data-product="u1"]')).toBeNull();
    await React.act(async () => container.querySelectorAll<HTMLButtonElement>('[aria-pressed]')[1].click());
    expect(container.textContent).toContain("No products found for JBG/YT");
    expect(container.querySelector("input")?.value).toBe("Tirz");
  });
});

it("respects organiser supplier restrictions, inactive products, and a changed allowed list", async () => {
  await mounted(async (container, root) => {
    const render = (allowed: string[]) => <SupplierProductBrowser products={[...products, { id: "inactive", name: "Hidden", vendorId: "j", active: false }]}
      vendors={vendors} allowedVendorIds={allowed} search="" onSearchChange={() => {}} quantities={{}}
      renderProduct={product => <p data-product={product.id}>{product.name}</p>} />;
    await React.act(async () => root.render(render(["j"])));
    expect(container.querySelector('[data-product="j1"]')).not.toBeNull();
    expect(container.querySelector('[data-product="u1"]')).toBeNull();
    expect(container.querySelector('[data-product="inactive"]')).toBeNull();
    await React.act(async () => root.render(render(["u"])));
    expect(container.querySelector('[data-product="u1"]')).not.toBeNull();
    expect(container.querySelector('[data-product="j1"]')).toBeNull();
    await React.act(async () => root.render(render([])));
    expect(container.textContent).toContain("No suppliers currently available");
  });
});

it("combines group quantities only within the same supplier, product identity and price without mutating items", async () => {
  await mounted(async (container, root) => {
    const items = [
      { productId: "same", productName: "Retatrutide", vendorId: "u", quantity: 1, unitPrice: 70 },
      { productId: "same", productName: "Retatrutide", vendorId: "j", quantity: 2, unitPrice: 50 },
      { productId: "same", productName: "Retatrutide", vendorId: "u", quantity: 2, unitPrice: 70 },
      { productId: "same", productName: "Retatrutide", vendorId: "u", quantity: 1, unitPrice: 60 },
    ];
    const original = structuredClone(items);
    items.forEach(Object.freeze);
    await React.act(async () => root.render(<SupplierItemGroups items={items} vendors={vendors} aggregate />));
    const uther = container.querySelector('[data-vendor-items="u"]')!;
    const jbg = container.querySelector('[data-vendor-items="j"]')!;
    expect(uther.textContent).toContain("Uther");
    expect(uther.textContent).toContain("×3");
    expect(uther.textContent).toContain("$270.00");
    expect(uther.querySelectorAll("li")).toHaveLength(2);
    expect(jbg.textContent).toContain("JBG/YT");
    expect(jbg.textContent).toContain("$100.00");
    expect(jbg.querySelectorAll("li")).toHaveLength(1);
    expect(items).toEqual(original);
  });
});

it("never assigns legacy untagged items to a named vendor", async () => {
  await mounted(async (container, root) => {
    await React.act(async () => root.render(<SupplierItemGroups vendors={vendors} items={[
      { productId: "legacy", productName: "Legacy product", quantity: 1, unitPrice: 5 },
    ]} />));
    expect(container.textContent).toContain("Supplier not specified");
    expect(container.textContent).not.toContain("Uther");
  });
});
