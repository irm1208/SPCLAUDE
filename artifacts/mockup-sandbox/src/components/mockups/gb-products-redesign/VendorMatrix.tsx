import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";

import {
  CATEGORIES,
  GROUP_BUY_NAME,
  SAMPLE_PRODUCTS,
  VENDORS,
  type ImportCandidate,
  type ImportReviewRow,
  type ProductRecord,
} from "./data";
import { ProductShell } from "./_shared/ProductShell";
import {
  ConfirmAction,
  ImportReview,
  MockFeedback,
  ProductForm,
} from "./_shared/ProductTools";
import {
  classifyImportRows,
  getProductStatus,
  resetProducts,
} from "./_shared/model";
import "./_group.css";

type VendorName = (typeof VENDORS)[number];
type ExceptionView = "all" | "price-changed" | "low-stock";
type StockFilter = "all" | "available" | "low" | "out" | "unlimited";
type ToolState =
  | { kind: "form"; productId: string | null }
  | { kind: "import"; mode: "csv" | "ai" }
  | null;
type ConfirmationState =
  | { kind: "import"; count: number }
  | { kind: "supplier-prices"; productIds: string[] }
  | null;
type FeedbackState = {
  message: string;
  previousProducts: ProductRecord[];
};

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const SUPPLIER_PRICES = new Map(
  SAMPLE_PRODUCTS.map((product, index) => {
    const sequence = index + 1;
    const adjustment = sequence % 6 === 0 ? 3.5 : sequence % 7 === 0 ? -2 : 0;
    return [product.id, Number(Math.max(0, product.price + adjustment).toFixed(2))];
  }),
);

const STYLES: Record<string, CSSProperties> = {
  workspace: {
    display: "grid",
    minWidth: 0,
    gap: 14,
  },
  pageHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  pageHeading: {
    margin: 0,
    color: "var(--gbpr-ink)",
    fontSize: 28,
    fontWeight: 790,
    letterSpacing: 0,
    lineHeight: 1.15,
  },
  pageCopy: {
    maxWidth: 650,
    margin: "6px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 12,
    lineHeight: 1.55,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  matrix: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(210px, 238px) minmax(680px, 1fr)",
    alignItems: "start",
    gap: 14,
  },
  vendorRail: {
    position: "sticky",
    top: 12,
    minWidth: 0,
    overflow: "hidden",
  },
  railHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: "15px 16px",
  },
  railIcon: {
    display: "grid",
    width: 36,
    height: 36,
    flex: "0 0 36px",
    placeItems: "center",
    borderRadius: 7,
    color: "var(--gbpr-navy)",
    background: "#EAF1FC",
  },
  railTitle: {
    margin: 0,
    color: "var(--gbpr-ink)",
    fontSize: 15,
    fontWeight: 780,
  },
  railCopy: {
    margin: "2px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 10,
  },
  railSection: {
    display: "grid",
    gap: 4,
    padding: "10px",
  },
  railLabel: {
    margin: "2px 6px 4px",
    color: "var(--gbpr-subtle)",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  railButton: {
    display: "flex",
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    border: "1px solid transparent",
    borderRadius: 7,
    padding: "8px 10px",
    color: "#405167",
    background: "transparent",
    fontSize: 11,
    fontWeight: 690,
    textAlign: "left",
  },
  railCount: {
    minWidth: 25,
    borderRadius: 999,
    padding: "3px 7px",
    color: "var(--gbpr-muted)",
    background: "#EEF2F6",
    fontSize: 9,
    fontWeight: 800,
    textAlign: "center",
  },
  panel: {
    minWidth: 0,
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    minHeight: 78,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    borderBottom: "1px solid var(--gbpr-border)",
    padding: "13px 16px",
    background: "#FBFCFE",
  },
  vendorIdentity: {
    display: "flex",
    minWidth: 0,
    flex: "1 1 330px",
    alignItems: "center",
    gap: 11,
  },
  vendorMark: {
    display: "grid",
    width: 42,
    height: 42,
    flex: "0 0 42px",
    placeItems: "center",
    borderRadius: 7,
    color: "#FFFFFF",
    background: "var(--gbpr-navy)",
    fontSize: 11,
    fontWeight: 850,
  },
  vendorTitle: {
    margin: 0,
    color: "var(--gbpr-ink)",
    fontSize: 19,
    fontWeight: 790,
  },
  vendorMeta: {
    margin: "4px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 10,
  },
  panelActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  filters: {
    display: "flex",
    minWidth: 0,
    alignItems: "end",
    flexWrap: "wrap",
    gap: 9,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: "10px 12px",
    background: "#FFFFFF",
  },
  filterField: {
    display: "grid",
    minWidth: 130,
    gap: 4,
    color: "var(--gbpr-muted)",
    fontSize: 9,
    fontWeight: 760,
  },
  select: {
    minWidth: 145,
    minHeight: 40,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 7,
    padding: "0 32px 0 10px",
    color: "var(--gbpr-ink)",
    background: "#FFFFFF",
    fontSize: 11,
  },
  search: {
    position: "relative",
    minWidth: 220,
    flex: "1 1 260px",
  },
  searchIcon: {
    position: "absolute",
    top: "50%",
    left: 11,
    width: 16,
    height: 16,
    color: "var(--gbpr-subtle)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    minHeight: 40,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 7,
    padding: "0 10px 0 34px",
    color: "var(--gbpr-ink)",
    background: "#FFFFFF",
    fontSize: 11,
  },
  bulkBar: {
    display: "flex",
    minHeight: 54,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    borderBottom: "1px solid rgba(45, 107, 204, 0.2)",
    padding: "8px 12px",
    color: "var(--gbpr-navy)",
    background: "#EEF4FD",
  },
  bulkCopy: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
  },
  empty: {
    display: "grid",
    minHeight: 250,
    placeItems: "center",
    padding: 28,
    color: "var(--gbpr-muted)",
    textAlign: "center",
  },
  emptyIcon: {
    width: 34,
    height: 34,
    marginBottom: 9,
    color: "#8AA0BA",
  },
  productName: {
    display: "grid",
    gap: 2,
  },
  productStrong: {
    color: "var(--gbpr-ink)",
    fontSize: 11,
    fontWeight: 750,
  },
  productMeta: {
    color: "var(--gbpr-muted)",
    fontSize: 9,
  },
  price: {
    color: "var(--gbpr-ink)",
    fontWeight: 750,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  supplierPrice: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--gbpr-navy)",
    fontWeight: 780,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  rowSelect: {
    width: 18,
    height: 18,
    margin: 0,
    accentColor: "var(--gbpr-blue)",
  },
  editButton: {
    width: 44,
    minWidth: 44,
    padding: 0,
  },
};

function cloneProducts(products: readonly ProductRecord[]): ProductRecord[] {
  return products.map((product) => ({ ...product }));
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function selectedVendorProducts(
  products: readonly ProductRecord[],
  vendor: VendorName,
): ProductRecord[] {
  return products.filter((product) => product.vendor === vendor);
}

function resolveVendorName(value: string): VendorName | null {
  const normalisedVendor = normalise(value);
  return (
    VENDORS.find((vendor) => normalise(vendor) === normalisedVendor) ?? null
  );
}

function getSupplierPrice(product: ProductRecord): number {
  return SUPPLIER_PRICES.get(product.id) ?? product.price;
}

function hasSupplierPriceChange(product: ProductRecord): boolean {
  return getSupplierPrice(product) !== product.price;
}

function isLowStock(product: ProductRecord): boolean {
  return product.stock !== null && product.stock > 0 && product.stock <= 5;
}

function matchesStock(product: ProductRecord, stock: StockFilter): boolean {
  if (stock === "available") return product.stock === null || product.stock > 0;
  if (stock === "low") return isLowStock(product);
  if (stock === "out") return product.stock === 0;
  if (stock === "unlimited") return product.stock === null;
  return true;
}

function importIdentity(row: Pick<ImportCandidate, "name" | "mgSize">): string {
  return `${normalise(row.name)}\u001f${normalise(row.mgSize)}`;
}

const IMPORT_PRODUCT_ID_PATTERN = /^prod-import-(\d+)$/;

function createImportIdAllocator(
  products: readonly ProductRecord[],
): () => string {
  const usedIds = new Set(products.map((product) => product.id));
  let nextSequence = 1;

  for (const product of products) {
    const match = IMPORT_PRODUCT_ID_PATTERN.exec(product.id);
    if (!match) continue;
    nextSequence = Math.max(nextSequence, Number(match[1]) + 1);
  }

  return () => {
    let candidate = `prod-import-${nextSequence}`;
    while (usedIds.has(candidate)) {
      nextSequence += 1;
      candidate = `prod-import-${nextSequence}`;
    }
    usedIds.add(candidate);
    nextSequence += 1;
    return candidate;
  };
}

function createImportCandidates(
  mode: "csv" | "ai",
  products: readonly ProductRecord[],
  vendor: VendorName,
): ImportCandidate[] {
  const vendorProducts = selectedVendorProducts(products, vendor);
  const changedProduct =
    vendorProducts.find(hasSupplierPriceChange) ?? vendorProducts[0];
  const duplicateProduct =
    vendorProducts.find(
      (product) => product.id !== changedProduct?.id && !hasSupplierPriceChange(product),
    ) ?? vendorProducts[1] ?? changedProduct;
  const rows: ImportCandidate[] = [];

  if (changedProduct) {
    rows.push({
      name: changedProduct.name,
      vendor,
      mgSize: changedProduct.mgSize,
      price: getSupplierPrice(changedProduct),
    });
  }
  if (duplicateProduct) {
    rows.push({
      name: duplicateProduct.name,
      vendor,
      mgSize: duplicateProduct.mgSize,
      price: duplicateProduct.price,
    });
  }

  rows.push({
    name: mode === "csv" ? `${vendor} catalogue addition` : `${vendor} AI extraction`,
    vendor,
    mgSize: mode === "csv" ? "10 mg" : "5 mg",
    price: mode === "csv" ? 34.5 : 39,
  });
  return rows;
}

function createImportReviewRows(
  mode: "csv" | "ai",
  products: readonly ProductRecord[],
  vendor: VendorName,
): ImportReviewRow[] {
  const vendorProducts = selectedVendorProducts(products, vendor);
  return classifyImportRows(
    vendorProducts,
    createImportCandidates(mode, products, vendor),
  );
}

function reclassifyImportRows(
  products: readonly ProductRecord[],
  vendor: VendorName,
  rows: readonly ImportReviewRow[],
): ImportReviewRow[] {
  const candidates = rows.map(({ name, price, mgSize, vendor: rowVendor }) => ({
    name,
    price,
    mgSize,
    vendor: rowVendor,
  }));
  const classified = classifyImportRows(
    selectedVendorProducts(products, vendor),
    candidates,
  );
  return classified.map((next, index) => ({
    ...next,
    id: rows[index].id,
    included: next.status === "duplicate" ? false : rows[index].included,
  }));
}

export function validateVendorImportRows(
  rows: readonly ImportReviewRow[],
  selectedVendor: VendorName,
): string | null {
  for (const row of rows) {
    if (!row.included) continue;
    const rowVendor = resolveVendorName(row.vendor);
    if (!rowVendor) {
      return `Choose a recognised vendor for ${row.name || "the imported row"}.`;
    }
    if (rowVendor !== selectedVendor) {
      return `Imported rows must stay within the selected ${selectedVendor} vendor.`;
    }
  }
  return null;
}

export function applyVendorImport(
  products: readonly ProductRecord[],
  rows: readonly ImportReviewRow[],
  selectedVendor: VendorName,
): ProductRecord[] {
  const acceptedRows = rows.filter((row) => row.included);
  const next = cloneProducts(products);
  const allocateImportId = createImportIdAllocator(next);

  for (const row of acceptedRows) {
    const rowVendor = resolveVendorName(row.vendor);
    if (rowVendor !== selectedVendor) continue;
    const identity = importIdentity(row);
    const existingIndex = next.findIndex(
      (product) =>
        product.vendor === rowVendor && importIdentity(product) === identity,
    );

    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        vendor: rowVendor,
        price: row.price,
        lastEdited: new Date().toISOString(),
      };
      continue;
    }

    next.push({
      id: allocateImportId(),
      name: row.name.trim(),
      description: `Imported from the ${rowVendor} supplier price list.`,
      vendor: rowVendor,
      category: CATEGORIES[0],
      mgSize: row.mgSize.trim(),
      price: row.price,
      stock: null,
      maxPerCustomer: null,
      halfKitEnabled: false,
      visible: true,
      lastEdited: new Date().toISOString(),
    });
  }

  return next;
}

export function getVendorExceptionCounts(
  products: readonly ProductRecord[],
  selectedVendor: VendorName,
): Record<Exclude<ExceptionView, "all">, number> {
  const vendorProducts = selectedVendorProducts(products, selectedVendor);
  return {
    "price-changed": vendorProducts.filter(hasSupplierPriceChange).length,
    "low-stock": vendorProducts.filter(isLowStock).length,
  };
}

function vendorInitials(vendor: VendorName): string {
  return vendor
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export default function VendorMatrix() {
  const [products, setProducts] = useState<ProductRecord[]>(() =>
    cloneProducts(SAMPLE_PRODUCTS),
  );
  const [selectedVendor, setSelectedVendor] = useState<VendorName>("QSC");
  const [exceptionView, setExceptionView] = useState<ExceptionView>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [tool, setTool] = useState<ToolState>(null);
  const [importRows, setImportRows] = useState<ImportReviewRow[]>([]);
  const [importScopeError, setImportScopeError] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const vendorCounts = useMemo(
    () =>
      Object.fromEntries(
        VENDORS.map((vendor) => [
          vendor,
          products.filter((product) => product.vendor === vendor).length,
        ]),
      ) as Record<VendorName, number>,
    [products],
  );

  const vendorContextProducts = useMemo(() => {
    const normalisedQuery = normalise(query);
    return selectedVendorProducts(products, selectedVendor).filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (!matchesStock(product, stock)) return false;
      if (!normalisedQuery) return true;
      return [product.name, product.mgSize, product.category].some((value) =>
        normalise(value).includes(normalisedQuery),
      );
    });
  }, [category, products, query, selectedVendor, stock]);

  const exceptionCounts = useMemo(
    () => getVendorExceptionCounts(vendorContextProducts, selectedVendor),
    [selectedVendor, vendorContextProducts],
  );

  const visibleProducts = useMemo(
    () =>
      vendorContextProducts.filter((product) => {
        if (exceptionView === "price-changed") {
          return hasSupplierPriceChange(product);
        }
        if (exceptionView === "low-stock") return isLowStock(product);
        return true;
      }),
    [exceptionView, vendorContextProducts],
  );

  const selectedVendorCount = vendorCounts[selectedVendor];
  const selectedPriceChanges = products.filter(
    (product) =>
      product.vendor === selectedVendor && hasSupplierPriceChange(product),
  ).length;
  const allVisibleSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((product) => selectedIds.has(product.id));
  const selectedCount = selectedIds.size;
  const editingProduct =
    tool?.kind === "form" && tool.productId
      ? products.find((product) => product.id === tool.productId) ?? null
      : null;

  function chooseVendor(vendor: VendorName) {
    setSelectedVendor(vendor);
    setExceptionView("all");
    setSelectedIds(new Set());
    setTool(null);
    setImportScopeError(null);
  }

  function chooseException(view: Exclude<ExceptionView, "all">) {
    setExceptionView(view);
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStock("all");
    setExceptionView("all");
    setSelectedIds(new Set());
  }

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const product of visibleProducts) next.delete(product.id);
      } else {
        for (const product of visibleProducts) next.add(product.id);
      }
      return next;
    });
  }

  function openImport(mode: "csv" | "ai") {
    setImportRows(createImportReviewRows(mode, products, selectedVendor));
    setTool({ kind: "import", mode });
    setImportScopeError(null);
    setConfirmationState(null);
  }

  function editImportRow(
    rowId: ImportReviewRow["id"],
    patch: Partial<
      Pick<ImportReviewRow, "name" | "price" | "vendor" | "mgSize">
    >,
  ) {
    setImportScopeError(null);
    setImportRows((current) => {
      const nextRows = current.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      );
      return reclassifyImportRows(products, selectedVendor, nextRows);
    });
  }

  function requestImportConfirmation() {
    const scopeError = validateVendorImportRows(importRows, selectedVendor);
    if (scopeError) {
      setImportScopeError(scopeError);
      return;
    }
    const count = importRows.filter((row) => row.included).length;
    if (count === 0) return;
    setConfirmationState({ kind: "import", count });
  }

  function confirmImport() {
    if (confirmationState?.kind !== "import") return;
    const scopeError = validateVendorImportRows(importRows, selectedVendor);
    if (scopeError) {
      setConfirmationState(null);
      setImportScopeError(scopeError);
      return;
    }
    const previousProducts = cloneProducts(products);
    const nextProducts = applyVendorImport(products, importRows, selectedVendor);
    setProducts(nextProducts);
    setSelectedIds(new Set());
    setTool(null);
    setImportRows([]);
    setImportScopeError(null);
    setConfirmationState(null);
    setFeedback({
      message: `${confirmationState.count} ${selectedVendor} ${confirmationState.count === 1 ? "product" : "products"} imported.`,
      previousProducts,
    });
  }

  function requestSupplierPriceUpdate() {
    const productIds = [...selectedIds].filter((productId) => {
      const product = products.find((entry) => entry.id === productId);
      return product?.vendor === selectedVendor && hasSupplierPriceChange(product);
    });
    if (productIds.length === 0) return;
    setConfirmationState({ kind: "supplier-prices", productIds });
  }

  function confirmSupplierPrices() {
    if (confirmationState?.kind !== "supplier-prices") return;
    const productIds = new Set(confirmationState.productIds);
    const previousProducts = cloneProducts(products);
    setProducts((current) =>
      current.map((product) =>
        product.vendor === selectedVendor && productIds.has(product.id)
          ? {
              ...product,
              price: getSupplierPrice(product),
              lastEdited: new Date().toISOString(),
            }
          : { ...product },
      ),
    );
    setSelectedIds(new Set());
    setConfirmationState(null);
    setFeedback({
      message: `${productIds.size} supplier ${productIds.size === 1 ? "price" : "prices"} applied to ${selectedVendor}.`,
      previousProducts,
    });
  }

  function saveProduct(patch: Partial<Omit<ProductRecord, "id">>) {
    const previousProducts = cloneProducts(products);
    if (tool?.kind === "form" && tool.productId) {
      const productId = tool.productId;
      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? { ...product, ...patch, lastEdited: new Date().toISOString() }
            : { ...product },
        ),
      );
      setFeedback({ message: "Product changes saved.", previousProducts });
    } else {
      const newProduct: ProductRecord = {
        id: `prod-local-${products.length + 1}`,
        name: patch.name ?? "Untitled product",
        description: patch.description ?? "Locally added catalogue product.",
        vendor: patch.vendor ?? selectedVendor,
        category: patch.category ?? CATEGORIES[0],
        mgSize: patch.mgSize ?? "",
        price: patch.price ?? 0,
        stock: patch.stock ?? null,
        maxPerCustomer: patch.maxPerCustomer ?? null,
        halfKitEnabled: patch.halfKitEnabled ?? false,
        visible: patch.visible ?? true,
        lastEdited: new Date().toISOString(),
      };
      setProducts((current) => [...cloneProducts(current), newProduct]);
      setSelectedVendor(
        VENDORS.includes(newProduct.vendor as VendorName)
          ? (newProduct.vendor as VendorName)
          : "Unassigned",
      );
      setFeedback({ message: `${newProduct.name} added.`, previousProducts });
    }
    setTool(null);
    setImportScopeError(null);
  }

  function deleteFormProduct() {
    if (tool?.kind !== "form" || !tool.productId) return;
    const target = products.find((product) => product.id === tool.productId);
    if (!target) {
      setTool(null);
      return;
    }

    const previousProducts = cloneProducts(products);
    setProducts((current) =>
      current
        .filter((product) => product.id !== target.id)
        .map((product) => ({ ...product })),
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(target.id);
      return next;
    });
    setFeedback({ message: `${target.name} deleted.`, previousProducts });
    setTool(null);
    setImportScopeError(null);
  }

  function resetPreview() {
    setProducts(resetProducts(products));
    setSelectedVendor("QSC");
    setExceptionView("all");
    setQuery("");
    setCategory("all");
    setStock("all");
    setSelectedIds(new Set());
    setTool(null);
    setImportRows([]);
    setImportScopeError(null);
    setConfirmationState(null);
    setFeedback(null);
  }

  return (
    <ProductShell
      concept="Vendor Matrix"
      pageTitle="Vendor Matrix"
      onReset={resetPreview}
    >
      <div style={STYLES.workspace}>
        <header style={STYLES.pageHeader}>
          <div>
            <span className="gbpr-eyebrow">Supplier reconciliation</span>
            <h2 style={STYLES.pageHeading}>Vendor Matrix</h2>
            <p style={STYLES.pageCopy}>
              Compare supplier updates with live catalogue prices for {GROUP_BUY_NAME},
              then publish only the rows you have reviewed.
            </p>
          </div>
          <div style={STYLES.headerActions}>
            <button
              type="button"
              className="gbpr-button"
              data-variant="secondary"
              onClick={() => openImport("csv")}
            >
              <FileSpreadsheet aria-hidden="true" />
              CSV Import
            </button>
            <button
              type="button"
              className="gbpr-button"
              data-variant="secondary"
              onClick={() => openImport("ai")}
            >
              <Sparkles aria-hidden="true" />
              AI Price List
            </button>
            <button
              type="button"
              className="gbpr-button"
              data-variant="primary"
              onClick={() => setTool({ kind: "form", productId: null })}
            >
              <Plus aria-hidden="true" />
              Add Product
            </button>
          </div>
        </header>

        {tool?.kind === "form" ? (
          <ProductForm
            product={editingProduct}
            onSave={saveProduct}
            onDelete={tool.productId ? deleteFormProduct : undefined}
            onCancel={() => setTool(null)}
          />
        ) : null}

        {tool?.kind === "import" ? (
          <section data-testid="review-import">
            {importScopeError ? (
              <p
                role="alert"
                style={{
                  margin: "0 0 10px",
                  border: "1px solid rgba(180, 35, 24, 0.2)",
                  borderRadius: 7,
                  padding: "10px 12px",
                  color: "#9B2C25",
                  background: "#FFF1EF",
                  fontSize: 11,
                  fontWeight: 680,
                }}
              >
                {importScopeError}
              </p>
            ) : null}
            <ImportReview
              rows={importRows}
              mode={tool.mode}
              onToggle={(rowId) => {
                setImportScopeError(null);
                setImportRows((current) =>
                  current.map((row) =>
                    row.id === rowId ? { ...row, included: !row.included } : row,
                  ),
                );
              }}
              onEdit={editImportRow}
              onConfirm={requestImportConfirmation}
              onCancel={() => {
                setTool(null);
                setImportRows([]);
                setImportScopeError(null);
              }}
            />
          </section>
        ) : null}

        <div className="gbpr-vendor-matrix-layout" style={STYLES.matrix}>
          <aside
            className="gbpr-panel"
            style={STYLES.vendorRail}
            aria-label="Vendor list"
          >
            <header style={STYLES.railHeader}>
              <span style={STYLES.railIcon} aria-hidden="true">
                <Store size={18} />
              </span>
              <div>
                <h2 style={STYLES.railTitle}>Vendors</h2>
                <p style={STYLES.railCopy}>{products.length} catalogue products</p>
              </div>
            </header>
            <div style={STYLES.railSection}>
              <span style={STYLES.railLabel}>Supplier accounts</span>
              {VENDORS.map((vendor) => {
                const active = vendor === selectedVendor && exceptionView === "all";
                return (
                  <button
                    type="button"
                    style={{
                      ...STYLES.railButton,
                      ...(active
                        ? {
                            borderColor: "rgba(45, 107, 204, 0.2)",
                            color: "var(--gbpr-navy)",
                            background: "#EAF1FC",
                          }
                        : null),
                    }}
                    aria-pressed={active}
                    onClick={() => chooseVendor(vendor)}
                    key={vendor}
                  >
                    <span>{vendor}</span>
                    <span style={STYLES.railCount}>{vendorCounts[vendor]}</span>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                ...STYLES.railSection,
                borderTop: "1px solid var(--gbpr-border-soft)",
              }}
            >
              <span style={STYLES.railLabel}>Exceptions</span>
              <button
                type="button"
                style={{
                  ...STYLES.railButton,
                  ...(exceptionView === "price-changed"
                    ? {
                        borderColor: "rgba(184, 115, 16, 0.24)",
                        color: "#8A570B",
                        background: "#FFF6E5",
                      }
                    : null),
                }}
                aria-pressed={exceptionView === "price-changed"}
                onClick={() => chooseException("price-changed")}
              >
                <span>Price changes</span>
                <span style={STYLES.railCount}>
                  {exceptionCounts["price-changed"]}
                </span>
              </button>
              <button
                type="button"
                style={{
                  ...STYLES.railButton,
                  ...(exceptionView === "low-stock"
                    ? {
                        borderColor: "rgba(180, 35, 24, 0.18)",
                        color: "#9B2C25",
                        background: "#FFF1EF",
                      }
                    : null),
                }}
                aria-pressed={exceptionView === "low-stock"}
                onClick={() => chooseException("low-stock")}
              >
                <span>Low stock</span>
                <span style={STYLES.railCount}>{exceptionCounts["low-stock"]}</span>
              </button>
            </div>
          </aside>

          <section
            className="gbpr-panel"
            style={STYLES.panel}
            aria-labelledby="vendor-matrix-title"
          >
            <header style={STYLES.panelHeader}>
              <div style={STYLES.vendorIdentity}>
                <span style={STYLES.vendorMark} aria-hidden="true">
                  {vendorInitials(selectedVendor)}
                </span>
                <div>
                  <span className="gbpr-eyebrow">Selected vendor</span>
                  <h3 id="vendor-matrix-title" style={STYLES.vendorTitle}>
                    {selectedVendor}
                  </h3>
                  <p style={STYLES.vendorMeta}>
                    {selectedVendorCount} products · {selectedPriceChanges} supplier
                    {selectedPriceChanges === 1 ? " change" : " changes"} to review
                  </p>
                </div>
              </div>
              <div style={STYLES.panelActions}>
                <button
                  type="button"
                  className="gbpr-button"
                  data-variant="secondary"
                  onClick={() => chooseException("price-changed")}
                >
                  <ClipboardCheck aria-hidden="true" />
                  Review changes
                </button>
                <button
                  type="button"
                  className="gbpr-button"
                  data-variant="primary"
                  onClick={() => openImport("csv")}
                >
                  <Upload aria-hidden="true" />
                  Import update
                </button>
              </div>
            </header>

            <div style={STYLES.filters}>
              <label style={{ ...STYLES.filterField, ...STYLES.search }}>
                <span>Search vendor products</span>
                <span style={{ position: "relative" }}>
                  <Search style={STYLES.searchIcon} aria-hidden="true" />
                  <input
                    style={STYLES.searchInput}
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder={`Search ${selectedVendor}`}
                  />
                </span>
              </label>
              <label style={STYLES.filterField}>
                <span>Category</span>
                <select
                  style={STYLES.select}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.currentTarget.value);
                    setSelectedIds(new Set());
                  }}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((entry) => (
                    <option value={entry} key={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label style={STYLES.filterField}>
                <span>Stock</span>
                <select
                  style={STYLES.select}
                  value={stock}
                  onChange={(event) => {
                    setStock(event.currentTarget.value as StockFilter);
                    setSelectedIds(new Set());
                  }}
                >
                  <option value="all">All stock</option>
                  <option value="available">Available</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </label>
              <button
                type="button"
                className="gbpr-button"
                data-variant="ghost"
                onClick={clearFilters}
              >
                <Filter aria-hidden="true" />
                Clear
              </button>
            </div>

            {selectedCount > 0 ? (
              <div style={STYLES.bulkBar} aria-live="polite">
                <span style={STYLES.bulkCopy}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <strong>{selectedCount}</strong>
                  {selectedCount === 1 ? " product selected" : " products selected"}
                </span>
                <div style={STYLES.panelActions}>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear selection
                  </button>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="primary"
                    onClick={requestSupplierPriceUpdate}
                    disabled={![...selectedIds].some((productId) => {
                      const product = products.find((entry) => entry.id === productId);
                      return product ? hasSupplierPriceChange(product) : false;
                    })}
                  >
                    Use supplier price
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <div className="gbpr-table-wrap">
                <table className="gbpr-table" aria-label={`${selectedVendor} price matrix`}>
                  <caption className="gbpr-visually-hidden">
                    Live and supplier prices for {selectedVendor}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <input
                          ref={(node) => {
                            if (node) {
                              node.indeterminate =
                                selectedCount > 0 && !allVisibleSelected;
                            }
                          }}
                          style={STYLES.rowSelect}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          aria-label={`Select all ${selectedVendor} products`}
                        />
                      </th>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col">Live price</th>
                      <th scope="col">Supplier price</th>
                      <th scope="col">Stock</th>
                      <th scope="col">Review state</th>
                      <th scope="col">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => {
                      const changed = hasSupplierPriceChange(product);
                      const status = getProductStatus(product);
                      const checked = selectedIds.has(product.id);
                      return (
                        <tr
                          key={product.id}
                          style={checked ? { background: "#F2F6FC" } : undefined}
                        >
                          <td>
                            <input
                              style={STYLES.rowSelect}
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProduct(product.id)}
                              aria-label={`Select ${product.name}`}
                            />
                          </td>
                          <td>
                            <span style={STYLES.productName}>
                              <strong style={STYLES.productStrong}>{product.name}</strong>
                              <small style={STYLES.productMeta}>{product.mgSize}</small>
                            </span>
                          </td>
                          <td>{product.category}</td>
                          <td>
                            <span style={STYLES.price}>{MONEY.format(product.price)}</span>
                          </td>
                          <td>
                            <span style={STYLES.supplierPrice}>
                              {MONEY.format(getSupplierPrice(product))}
                              {changed ? <ArrowRight size={13} aria-hidden="true" /> : null}
                            </span>
                          </td>
                          <td>
                            {product.stock === null ? "Unlimited" : product.stock}
                            <span className="gbpr-visually-hidden">, {status}</span>
                          </td>
                          <td>
                            <span
                              className="gbpr-status"
                              data-status={changed ? "price-changed" : "duplicate"}
                            >
                              {changed ? "Price changed" : "Matched"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="gbpr-button"
                              data-variant="ghost"
                              style={STYLES.editButton}
                              aria-label={`Edit ${product.name}`}
                              title="Edit product"
                              onClick={() =>
                                setTool({ kind: "form", productId: product.id })
                              }
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={STYLES.empty}>
                <div>
                  <PackageSearch style={STYLES.emptyIcon} aria-hidden="true" />
                  <h3 style={{ margin: 0, color: "var(--gbpr-ink)", fontSize: 15 }}>
                    No vendor products match
                  </h3>
                  <p style={{ margin: "6px 0 12px", fontSize: 11 }}>
                    Clear the active search, category, stock, or exception filter.
                  </p>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            <footer
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderTop: "1px solid var(--gbpr-border)",
                padding: "10px 14px",
                color: "var(--gbpr-muted)",
                background: "#FBFCFE",
                fontSize: 10,
              }}
            >
              <span>
                Showing <strong>{visibleProducts.length}</strong> of {selectedVendorCount}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Boxes size={14} aria-hidden="true" />
                Prices stay local to this preview
              </span>
            </footer>
          </section>
        </div>
      </div>

      <ConfirmAction
        open={confirmationState !== null}
        title={
          confirmationState?.kind === "import"
            ? `Apply ${selectedVendor} import?`
            : "Apply supplier prices?"
        }
        description={
          confirmationState?.kind === "import"
            ? `This applies ${confirmationState.count} accepted rows only within the selected ${selectedVendor} vendor context. You can undo the update afterward.`
            : confirmationState?.kind === "supplier-prices"
              ? `This replaces live prices for ${confirmationState.productIds.length} selected ${selectedVendor} products. You can undo the update afterward.`
              : "Review this local catalogue update before applying it."
        }
        confirmLabel={
          confirmationState?.kind === "import"
            ? "Apply import"
            : "Apply supplier prices"
        }
        tone="primary"
        onConfirm={
          confirmationState?.kind === "import"
            ? confirmImport
            : confirmSupplierPrices
        }
        onCancel={() => setConfirmationState(null)}
      />

      {feedback ? (
        <MockFeedback
          message={feedback.message}
          onUndo={() => {
            setProducts(cloneProducts(feedback.previousProducts));
            setSelectedIds(new Set());
            setFeedback(null);
          }}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </ProductShell>
  );
}
