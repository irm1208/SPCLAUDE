# Products Inline Inspector Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the product inspector immediately below the active product at 1180px and below while preserving the existing desktop split layout.

**Architecture:** Extract the inspector JSX into a local renderer with placement-specific datalist IDs. Keep a desktop instance in the second workspace column and add a responsive inline instance after the selected product row, with an inline instance before the rows while adding a product. CSS media queries ensure only one placement is rendered visually and participates in focus order at each breakpoint.

**Tech Stack:** React 19, TypeScript, CSS media queries, Node test runner

---

### Task 1: Add responsive inspector placement

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/products-split-inspector.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/products-split-inspector.css`

- [ ] **Step 1: Write the failing responsive placement contract**

Add this test to `products-split-inspector.test.ts`:

```ts
test("Split Inspector moves beneath the active product on smaller screens", () => {
  const products = read("./GbProductsTab.tsx");
  const css = read("./products-split-inspector.css");

  assert.match(products, /products-split__inline-inspector/);
  assert.match(products, /!adding && product\.id === selectedId/);
  assert.match(products, /adding \? renderInlineInspector\(\) : null/);
  assert.match(css, /\.products-split__inline-inspector\s*\{\s*display:\s*none/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?\.products-split__desktop-inspector\s*\{\s*display:\s*none/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?\.products-split__inline-inspector\s*\{\s*display:\s*block/);
});
```

- [ ] **Step 2: Run the test and verify the responsive contract fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/products-split-inspector.test.ts
```

Expected: FAIL because `products-split__inline-inspector` is not present.

- [ ] **Step 3: Extract the inspector renderer and add both placements**

In `GbProductsTab.tsx`, add `Fragment` to the React import. Move the inspector section above the component return and use placement-specific datalist IDs:

```tsx
function renderInspector(placement: "desktop" | "inline") {
  const vendorListId = `product-vendors-${placement}`;
  const categoryListId = `product-categories-${placement}`;
  return (
    <section className="products-split__inspector" aria-label="Product inspector">
      {adding || selectedProduct ? (
        <form onSubmit={saveDraft}>
          <header>
            <div><span className="products-split__eyebrow">Product inspector</span><h3>{adding ? "Add product" : selectedProduct?.name}</h3></div>
            <span className="products-split__dirty" data-dirty={dirty}>{dirty ? "Unsaved changes" : "Saved"}</span>
          </header>
          <div className="products-split__fields">
            <label className="products-split__wide"><span>Name</span><input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} required /></label>
            <label><span>Vendor</span><input value={draft.vendor} list={vendorListId} onChange={event => setDraft(current => ({ ...current, vendor: event.target.value }))} required /><datalist id={vendorListId}>{vendors.map(item => <option key={item}>{item}</option>)}</datalist></label>
            <label><span>Category</span><input value={draft.category} list={categoryListId} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} /><datalist id={categoryListId}>{categories.map(item => <option key={item}>{item}</option>)}</datalist></label>
            <label><span>Size / mg</span><input value={draft.mgSize} onChange={event => setDraft(current => ({ ...current, mgSize: event.target.value }))} placeholder="10 mg" /></label>
            <label><span>Price</span><input type="number" min="0" step="0.01" value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} required /></label>
            <label><span>Stock</span><input type="number" min="0" step="1" value={draft.stock} onChange={event => setDraft(current => ({ ...current, stock: event.target.value }))} placeholder="Unlimited" /></label>
            <label><span>Max per customer</span><input type="number" min="1" step="1" value={draft.maxPerCustomer} onChange={event => setDraft(current => ({ ...current, maxPerCustomer: event.target.value }))} placeholder="No limit" /></label>
            <fieldset className="products-split__toggles products-split__wide"><legend>Availability</legend><label><span><strong>Half kits</strong><small>Allow half-kit reservations.</small></span><input type="checkbox" checked={draft.halfKitEnabled} onChange={event => setDraft(current => ({ ...current, halfKitEnabled: event.target.checked }))} /></label></fieldset>
          </div>
          <footer>
            {!adding ? <button type="button" className="products-split__delete" onClick={() => void deleteProduct()}><Trash2 aria-hidden="true" /> Delete product</button> : <span />}
            <div><button type="button" onClick={() => { if (!dirty || window.confirm("Discard the unsaved product changes?")) { setAdding(false); setSelectedId(products[0]?.id ?? null); } }}>Cancel</button><button type="submit" className="products-split__button--primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {adding ? "Add Product" : "Save changes"}</button></div>
          </footer>
        </form>
      ) : (
        <div className="products-split__empty"><Boxes aria-hidden="true" /><h3>Select a product</h3><p>Choose a catalogue row to inspect and edit it.</p></div>
      )}
    </section>
  );
}

const renderInlineInspector = () => (
  <div className="products-split__inline-inspector">
    {renderInspector("inline")}
  </div>
);
```

Use placement-specific datalist IDs in the existing vendor and category inputs:

```tsx
const vendorListId = `product-vendors-${placement}`;
const categoryListId = `product-categories-${placement}`;
```

Render the add form before the product rows and the edit form after the active row:

```tsx
{adding ? renderInlineInspector() : null}
{filteredProducts.map(product => (
  <Fragment key={product.id}>
    <article className="products-split__row" data-current={!adding && product.id === selectedId}>
      <label className="products-split__select"><span className="sr-only">Select {product.name}</span><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelection(product.id)} /></label>
      <button type="button" onClick={() => chooseProduct(product.id)} aria-current={!adding && product.id === selectedId ? "true" : undefined}>
        <span className="products-split__row-main"><strong>{product.name}</strong><small>{product.vendor || "Unassigned"} / {product.category || "Uncategorised"}</small></span>
        <span className="products-split__row-metrics"><strong>{currency} {Number(product.price ?? 0).toFixed(2)}</strong><small>{product.stock == null ? "Unlimited" : `${product.stock} stock`}</small><em data-status={productStatus(product)}>{statusLabel(product)}</em></span>
        <ChevronRight aria-hidden="true" />
      </button>
    </article>
    {!adding && product.id === selectedId ? renderInlineInspector() : null}
  </Fragment>
))}
```

Replace the existing desktop section with:

```tsx
<div className="products-split__desktop-inspector">
  {renderInspector("desktop")}
</div>
```

- [ ] **Step 4: Add desktop and responsive visibility rules**

Add the default rules in `products-split-inspector.css`:

```css
.products-split__desktop-inspector { min-width: 0; }
.products-split__inline-inspector { display: none; }
```

Inside the existing `@media (max-width: 1180px)` block, add:

```css
.products-split__desktop-inspector { display: none; }
.products-split__inline-inspector {
  display: block;
  border-bottom: 1px solid var(--t-border);
  padding: 10px;
  background: #f6f8fb;
}
.products-split__inline-inspector .products-split__inspector {
  min-height: 0;
}
```

Keep the existing mobile field and footer rules at 700px.

- [ ] **Step 5: Run focused tests and verify they pass**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test \
  src/pages/organiser-v2/products-split-inspector.test.ts \
  src/pages/organiser-v2/api/organiser-resources.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 6: Verify live Vite transforms**

Run:

```bash
curl -fsS -o /tmp/gb-products-module.js -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:3001/src/pages/organiser-v2/GbProductsTab.tsx
curl -fsS -o /tmp/gb-products-style.js -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:3001/src/pages/organiser-v2/products-split-inspector.css
```

Expected: both requests return `200 text/javascript`.

- [ ] **Step 7: Commit the responsive change**

```bash
git add \
  artifacts/peps-anonymous/src/pages/organiser-v2/products-split-inspector.test.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/products-split-inspector.css \
  docs/superpowers/plans/2026-07-18-products-inline-inspector-responsive.md
git commit -m "feat: place product inspector under active row"
```
