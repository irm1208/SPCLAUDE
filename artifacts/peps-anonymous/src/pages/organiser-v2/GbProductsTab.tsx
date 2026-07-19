import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  FileSpreadsheet,
  FilterX,
  Loader2,
  PackageOpen,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  organiserApi,
  type ApiProduct,
} from "./api/organiser-api";

type ProductRecord = ApiProduct & {
  priceOverride?: number | string | null;
};

type ProductDraft = {
  name: string;
  vendor: string;
  category: string;
  mgSize: string;
  price: string;
  stock: string;
  maxPerCustomer: string;
  halfKitEnabled: boolean;
};

type StockFilter = "all" | "available" | "low" | "out" | "unlimited";
type Feedback = { message: string; tone: "success" | "error" } | null;

export type GbProductsTabProps = {
  selectedGbId: string;
  groupBuyName?: string;
  currency?: string;
};

const EMPTY_DRAFT: ProductDraft = {
  name: "",
  vendor: "",
  category: "",
  mgSize: "",
  price: "",
  stock: "",
  maxPerCustomer: "",
  halfKitEnabled: true,
};

function toDraft(product: ProductRecord | null): ProductDraft {
  if (!product) return { ...EMPTY_DRAFT };
  return {
    name: product.name,
    vendor: product.vendor ?? "",
    category: product.category ?? "",
    mgSize: product.mgSize ?? "",
    price: String(Number(product.price ?? 0)),
    stock: product.stock === null || product.stock === undefined ? "" : String(product.stock),
    maxPerCustomer: product.maxPerCustomer == null ? "" : String(product.maxPerCustomer),
    halfKitEnabled: Boolean(product.halfKitEnabled),
  };
}

// Units left = stock cap minus units sold (orders never decrement the stock
// number itself, so remaining must be derived). null = unlimited stock.
function remainingStock(product: ProductRecord): number | null {
  if (product.stock === null || product.stock === undefined) return null;
  return product.stock - (product.sold ?? 0);
}

function soldSummary(product: ProductRecord): string {
  const sold = product.sold ?? 0;
  if (product.stock === null || product.stock === undefined) return `${sold} sold / Unlimited`;
  return `${sold}/${product.stock} sold`;
}

function productStatus(product: ProductRecord): "live" | "hidden" | "low" | "out" {
  if (product.active === false) return "hidden";
  const remaining = remainingStock(product);
  if (remaining !== null && remaining <= 0) return "out";
  if (remaining !== null && remaining <= 5) return "low";
  return "live";
}

function statusLabel(product: ProductRecord): string {
  const status = productStatus(product);
  if (status === "hidden") return "Hidden";
  if (status === "out") return "Out of stock";
  if (status === "low") return "Low stock";
  return "Live";
}

function parseDraft(draft: ProductDraft): { body?: Record<string, unknown>; error?: string } {
  const price = Number(draft.price);
  if (!draft.name.trim()) return { error: "Enter a product name." };
  if (!draft.vendor.trim()) return { error: "Choose a vendor." };
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
    return { error: "Price must be zero or more." };
  }
  if (draft.stock.trim() && (!Number.isInteger(Number(draft.stock)) || Number(draft.stock) < 0)) {
    return { error: "Stock must be a whole number or blank for unlimited." };
  }
  if (
    draft.maxPerCustomer.trim() &&
    (!Number.isInteger(Number(draft.maxPerCustomer)) || Number(draft.maxPerCustomer) < 1)
  ) {
    return { error: "Maximum per customer must be at least 1 or blank." };
  }
  return {
    body: {
      name: draft.name.trim(),
      vendor: draft.vendor.trim(),
      category: draft.category.trim() || null,
      mgSize: draft.mgSize.trim() || null,
      price,
      stock: draft.stock.trim() ? Number(draft.stock) : null,
      maxPerCustomer: draft.maxPerCustomer.trim() ? Number(draft.maxPerCustomer) : null,
      halfKitEnabled: draft.halfKitEnabled,
    },
  };
}

export default function GbProductsTab({
  selectedGbId,
  groupBuyName = "Current group buy",
  currency = "GBP",
}: GbProductsTabProps) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>({ ...EMPTY_DRAFT });
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("all");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState("");
  const [bulkVendor, setBulkVendor] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(product => product.id === selectedId) ?? null;
  const dirty = adding
    ? JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT)
    : selectedProduct
      ? JSON.stringify(draft) !== JSON.stringify(toDraft(selectedProduct))
      : false;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const rows = await organiserApi.products(selectedGbId);
      const next = rows as ProductRecord[];
      setProducts(next);
      setSelectedId(current => current && next.some(product => product.id === current)
        ? current
        : next[0]?.id ?? null);
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Products could not be loaded.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedGbId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!adding) setDraft(toDraft(selectedProduct));
  }, [adding, selectedProduct]);

  const vendors = useMemo(
    () => [...new Set(products.map(product => product.vendor).filter((value): value is string => Boolean(value)))].sort(),
    [products],
  );
  const categories = useMemo(
    () => [...new Set(products.map(product => product.category).filter((value): value is string => Boolean(value)))].sort(),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(product => {
      if (needle && ![product.name, product.vendor, product.category, product.mgSize]
        .some(value => String(value ?? "").toLowerCase().includes(needle))) return false;
      if (vendor !== "all" && product.vendor !== vendor) return false;
      if (category !== "all" && product.category !== category) return false;
      const remaining = remainingStock(product);
      if (stock === "available" && remaining != null && remaining <= 0) return false;
      if (stock === "low" && !(remaining !== null && remaining > 0 && remaining <= 5)) return false;
      if (stock === "out" && !(remaining !== null && remaining <= 0)) return false;
      if (stock === "unlimited" && product.stock != null) return false;
      return true;
    });
  }, [category, products, query, stock, vendor]);
  const selectedProductIsVisible = filteredProducts.some(product => product.id === selectedId);

  function chooseProduct(productId: string) {
    if (productId === selectedId && !adding) return;
    if (dirty && !window.confirm("Discard the unsaved product changes?")) return;
    setAdding(false);
    setSelectedId(productId);
    setFeedback(null);
  }

  function beginAdd() {
    if (dirty && !window.confirm("Discard the unsaved product changes?")) return;
    setAdding(true);
    setSelectedId(null);
    setDraft({ ...EMPTY_DRAFT });
    setFeedback(null);
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    const result = parseDraft(draft);
    if (!result.body) {
      setFeedback({ message: result.error ?? "Check the product fields.", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const { maxPerCustomer, ...ownedFields } = result.body;
      if (adding) {
        const created = await organiserApi.createProduct(selectedGbId, ownedFields);
        const [ownedProduct] = await Promise.all([
          organiserApi.updateOwnedProduct(created.id, ownedFields),
          organiserApi.updateProduct(selectedGbId, created.id, { maxPerCustomer }),
        ]);
        const saved = { ...created, ...ownedProduct, maxPerCustomer } as ProductRecord;
        setProducts(current => [...current, saved]);
        setSelectedId(saved.id);
        setAdding(false);
        setDraft(toDraft(saved));
        setFeedback({ message: `${saved.name} added.`, tone: "success" });
      } else if (selectedProduct) {
        const [ownedProduct] = await Promise.all([
          organiserApi.updateOwnedProduct(selectedProduct.id, ownedFields),
          organiserApi.updateProduct(selectedGbId, selectedProduct.id, { maxPerCustomer }),
        ]);
        const updated = { ...selectedProduct, ...ownedProduct, maxPerCustomer } as ProductRecord;
        setProducts(current => current.map(product => product.id === updated.id ? updated : product));
        setDraft(toDraft(updated));
        setFeedback({ message: `${updated.name} saved.`, tone: "success" });
      }
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Product could not be saved.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!selectedProduct || !window.confirm(`Delete ${selectedProduct.name}?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/organiser/products/${encodeURIComponent(selectedProduct.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Product could not be deleted.");
      const next = products.filter(product => product.id !== selectedProduct.id);
      setProducts(next);
      setSelectedIds(current => {
        const copy = new Set(current);
        copy.delete(selectedProduct.id);
        return copy;
      });
      setSelectedId(next[0]?.id ?? null);
      setFeedback({ message: `${selectedProduct.name} deleted.`, tone: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Product could not be deleted.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(productId: string) {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function applyBulk(patch: Record<string, unknown>, message: string) {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      await Promise.all([...selectedIds].map(productId =>
        Object.hasOwn(patch, "vendor")
          ? organiserApi.updateOwnedProduct(productId, patch)
          : organiserApi.updateProduct(selectedGbId, productId, patch),
      ));
      setProducts(current => current.map(product => selectedIds.has(product.id)
        ? ({ ...product, ...patch } as ProductRecord)
        : product));
      setSelectedIds(new Set());
      setFeedback({ message, tone: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Bulk update failed.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      const rows = lines.slice(start).map(line => {
        const [name, price, rowVendor, rowCategory, mgSize, rowStock] = line
          .split(",")
          .map(value => value.trim().replace(/^"|"$/g, ""));
        return {
          name,
          price: Number(price) || 0,
          vendor: rowVendor || null,
          category: rowCategory || null,
          mgSize: mgSize || null,
          stock: rowStock ? Number(rowStock) : null,
        };
      }).filter(row => row.name);
      await Promise.all(rows.map(row => organiserApi.createProduct(selectedGbId, row)));
      await loadProducts();
      setFeedback({ message: `${rows.length} CSV products imported.`, tone: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "CSV import failed.", tone: "error" });
    }
  }

  async function handleAiImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("The price list could not be read."));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(selectedGbId)}/import-image`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: dataUrl.split(",")[1], mimeType: file.type }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "AI extraction failed.");
      const rows = Array.isArray(payload.products) ? payload.products : [];
      await Promise.all(rows.map((row: Record<string, unknown>) => organiserApi.createProduct(selectedGbId, row)));
      await loadProducts();
      setFeedback({ message: `${rows.length} AI-extracted products imported.`, tone: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "AI import failed.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  const clearFilters = () => {
    setQuery("");
    setVendor("all");
    setCategory("all");
    setStock("all");
  };

  function renderInspector(placement: "desktop" | "inline") {
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
              <label><span>Vendor</span><input value={draft.vendor} list={`product-vendors-${placement}`} onChange={event => setDraft(current => ({ ...current, vendor: event.target.value }))} required /><datalist id={`product-vendors-${placement}`}>{vendors.map(item => <option key={item}>{item}</option>)}</datalist></label>
              <label><span>Category</span><input value={draft.category} list={`product-categories-${placement}`} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} /><datalist id={`product-categories-${placement}`}>{categories.map(item => <option key={item}>{item}</option>)}</datalist></label>
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

  function renderInlineInspector() {
    return (
      <div className="products-split__inline-inspector">
        {renderInspector("inline")}
      </div>
    );
  }

  return (
    <div className="approved-inventory-allocation products-split">
      <header className="products-split__header">
        <div>
          <span className="products-split__eyebrow">Catalogue workspace</span>
          <h2>Products</h2>
          <p><strong>{products.length}</strong> products in {groupBuyName}; <strong>{filteredProducts.length}</strong> in this view.</p>
        </div>
        <div className="products-split__header-actions">
          <input ref={csvInputRef} hidden type="file" accept=".csv,.txt" onChange={handleCsvImport} />
          <input ref={aiInputRef} hidden type="file" accept="image/*,.pdf" onChange={handleAiImport} />
          <button type="button" className="products-split__button" onClick={() => csvInputRef.current?.click()}>
            <FileSpreadsheet aria-hidden="true" /> CSV Import
          </button>
          <button type="button" className="products-split__button" onClick={() => aiInputRef.current?.click()}>
            <Sparkles aria-hidden="true" /> AI Price List
          </button>
          <button type="button" className="products-split__button products-split__button--primary" onClick={beginAdd}>
            <Plus aria-hidden="true" /> Add Product
          </button>
        </div>
      </header>

      {feedback ? (
        <div className="products-split__feedback" data-tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.tone === "error" ? <CircleAlert aria-hidden="true" /> : <Check aria-hidden="true" />}
          <span>{feedback.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <section className="products-split__filters" aria-label="Product filters">
        <label className="products-split__search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, vendor, size or category" />
        </label>
        <label><span>Vendor</span><select value={vendor} onChange={event => setVendor(event.target.value)}><option value="all">All vendors</option>{vendors.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>Stock</span><select value={stock} onChange={event => setStock(event.target.value as StockFilter)}><option value="all">All stock</option><option value="available">Available</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="unlimited">Unlimited</option></select></label>
        <button type="button" className="products-split__icon-button" aria-label="Clear product filters" onClick={clearFilters}><FilterX aria-hidden="true" /></button>
      </section>

      {selectedIds.size > 0 ? (
        <section className="products-split__bulk" data-testid="products-bulk-toolbar" aria-label="Bulk product actions">
          <strong>{selectedIds.size} selected</strong>
          <label><span>Set stock</span><input value={bulkStock} onChange={event => setBulkStock(event.target.value)} placeholder="Unlimited" inputMode="numeric" /></label>
          <button type="button" onClick={() => void applyBulk({ stock: bulkStock.trim() ? Number(bulkStock) : null }, `Stock updated for ${selectedIds.size} products.`)}>Apply stock</button>
          <label><span>Set vendor</span><select value={bulkVendor} onChange={event => setBulkVendor(event.target.value)}><option value="">Choose vendor</option>{vendors.map(item => <option key={item}>{item}</option>)}</select></label>
          <button type="button" disabled={!bulkVendor} onClick={() => void applyBulk({ vendor: bulkVendor }, `Vendor updated for ${selectedIds.size} products.`)}>Apply vendor</button>
          <button type="button" className="products-split__icon-button" aria-label="Clear selection" onClick={() => setSelectedIds(new Set())}><X aria-hidden="true" /></button>
        </section>
      ) : null}

      <div className="products-split__workspace">
        <section className="products-split__catalogue" aria-label="Product catalogue">
          <header>
            <div><h3>Product catalogue</h3><p>{filteredProducts.length} matching products</p></div>
            <label><input type="checkbox" checked={filteredProducts.length > 0 && filteredProducts.every(product => selectedIds.has(product.id))} onChange={event => setSelectedIds(event.target.checked ? new Set(filteredProducts.map(product => product.id)) : new Set())} /> Select all</label>
          </header>
          <div className="products-split__list">
            {loading ? <div className="products-split__empty"><Loader2 className="animate-spin" aria-hidden="true" /><p>Loading products...</p></div> : null}
            {!loading && filteredProducts.length === 0 ? <div className="products-split__empty"><PackageOpen aria-hidden="true" /><h3>No products match</h3><button type="button" onClick={clearFilters}>Clear filters</button></div> : null}
            {adding ? renderInlineInspector() : null}
            {!adding && selectedProduct && !selectedProductIsVisible ? renderInlineInspector() : null}
            {filteredProducts.map(product => (
              <Fragment key={product.id}>
                <article className="products-split__row" data-current={!adding && product.id === selectedId}>
                  <label className="products-split__select"><span className="sr-only">Select {product.name}</span><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelection(product.id)} /></label>
                  <button type="button" onClick={() => chooseProduct(product.id)} aria-current={!adding && product.id === selectedId ? "true" : undefined}>
                    <span className="products-split__row-main"><strong>{product.name}</strong><small>{product.vendor || "Unassigned"} / {product.category || "Uncategorised"}</small></span>
                    <span className="products-split__row-metrics"><strong>{currency} {Number(product.price ?? 0).toFixed(2)}</strong><small>{soldSummary(product)}</small><em data-status={productStatus(product)}>{statusLabel(product)}</em></span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </article>
                {!adding && product.id === selectedId ? renderInlineInspector() : null}
              </Fragment>
            ))}
          </div>
        </section>

        <div className="products-split__desktop-inspector">
          {renderInspector("desktop")}
        </div>
      </div>
    </div>
  );
}
