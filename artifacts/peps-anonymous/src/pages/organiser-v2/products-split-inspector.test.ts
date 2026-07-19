import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("workspace uses the production Split Inspector products tab", () => {
  const workspace = read("./Workspace.tsx");
  const products = read("./GbProductsTab.tsx");

  assert.match(workspace, /import GbProductsTab from "\.\/GbProductsTab"/);
  assert.match(workspace, /<GbProductsTab[\s\S]*?selectedGbId=\{gb\.id\}/);
  assert.doesNotMatch(workspace, /ProductsTab as LiveProductsTab/);

  for (const label of [
    "Product catalogue",
    "Product inspector",
    "Unsaved changes",
    "Save changes",
    "Max per customer",
    "Half kits",
    "CSV Import",
    "AI Price List",
  ]) {
    assert.match(products, new RegExp(label));
  }

  assert.match(products, /organiserApi\.products/);
  assert.match(products, /organiserApi\.createProduct/);
  assert.match(products, /organiserApi\.updateProduct/);
  assert.match(products, /organiserApi\.updateOwnedProduct/);
  assert.match(products, /aria-label="Product catalogue"/);
  assert.match(products, /aria-label="Product inspector"/);
  assert.match(products, /data-testid="products-bulk-toolbar"/);
  assert.match(products, /approved-inventory-allocation/);
  assert.doesNotMatch(products, /<span>Description<\/span>/);
  assert.doesNotMatch(products, /<strong>Visibility<\/strong>/);
});

test("Split Inspector treats nullish stock as unlimited", () => {
  const products = read("./GbProductsTab.tsx");

  assert.match(products, /stock === "available" && product\.stock != null && product\.stock <= 0/);
  assert.match(products, /stock === "unlimited" && product\.stock != null/);
});

test("Split Inspector styles preserve desktop density and responsive stacking", () => {
  const entry = read("../GbOrganiserV2.tsx");
  const css = read("./products-split-inspector.css");

  assert.match(entry, /\.\/organiser-v2\/products-split-inspector\.css/);
  assert.match(css, /\.products-split__workspace/);
  assert.match(css, /grid-template-columns:\s*minmax\(300px, 390px\) minmax\(460px, 1fr\)/);
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /:focus-visible/);
});

test("Split Inspector moves the active inspector directly below its responsive row", () => {
  const products = read("./GbProductsTab.tsx");
  const css = read("./products-split-inspector.css");
  const responsiveStart = css.indexOf("@media (max-width: 1180px)");
  const mobileStart = css.indexOf("@media (max-width: 700px)");
  const defaultCss = css.slice(0, responsiveStart);
  const responsiveCss = css.slice(responsiveStart, mobileStart);

  assert.match(products, /products-split__inline-inspector/);
  assert.match(
    products,
    /\{adding \? renderInlineInspector\(\) : null\}[\s\S]*?\{filteredProducts\.map\(product => \(/,
  );
  assert.match(
    products,
    /<\/article>\s*\{!adding && product\.id === selectedId \? renderInlineInspector\(\) : null\}/,
  );
  assert.match(defaultCss, /\.products-split__inline-inspector\s*\{[^}]*display:\s*none/);
  assert.match(responsiveCss, /\.products-split__desktop-inspector\s*\{[^}]*display:\s*none/);
  assert.match(responsiveCss, /\.products-split__inline-inspector\s*\{[^}]*display:\s*block/);
});

test("Split Inspector keeps a filtered active product reachable inline", () => {
  const products = read("./GbProductsTab.tsx");

  assert.match(
    products,
    /const selectedProductIsVisible = filteredProducts\.some\(product => product\.id === selectedId\);/,
  );
  assert.match(
    products,
    /\{!adding && selectedProduct && !selectedProductIsVisible \? renderInlineInspector\(\) : null\}[\s\S]*?\{filteredProducts\.map\(product => \(/,
  );
});

test("owned product fields use the organiser product endpoint", () => {
  const api = read("./api/organiser-api.ts");

  assert.match(api, /updateOwnedProduct:/);
  assert.match(api, /`\/organiser\/products\/\$\{encodeURIComponent\(productId\)\}`/);
  assert.match(api, /method: "PUT"/);
});
