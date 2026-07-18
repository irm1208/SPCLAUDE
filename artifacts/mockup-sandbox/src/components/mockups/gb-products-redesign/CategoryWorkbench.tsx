import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderTree,
  Layers3,
  PackageOpen,
  Plus,
  Sparkles,
} from "lucide-react";

import {
  CATEGORIES,
  GROUP_BUY_NAME,
  SAMPLE_PRODUCTS,
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
  applyBulkPatch,
  classifyImportRows,
  getProductStatus,
  resetProducts,
} from "./_shared/model";
import "./_group.css";

type Category = (typeof CATEGORIES)[number];
type SavedView = "low-stock" | "missing-vendor";
type CatalogueView = "all" | Category | SavedView;
type ToolState = "add" | "csv" | "ai" | null;

type GroupConfirmation = {
  category: Category;
  productIds: string[];
  nextVisibility: boolean;
} | null;

type FeedbackState = {
  message: string;
  previousProducts: ProductRecord[];
};

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

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
    maxWidth: 640,
    margin: "6px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 12,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  workbench: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "start",
    gap: 14,
  },
  map: {
    position: "sticky",
    top: 82,
    display: "grid",
    flex: "1 1 210px",
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    background: "var(--gbpr-panel)",
    boxShadow: "var(--gbpr-shadow-panel)",
  },
  mapHeader: {
    display: "flex",
    minHeight: 54,
    alignItems: "center",
    gap: 9,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: "10px 12px",
    color: "var(--gbpr-navy)",
  },
  mapIcon: {
    width: 18,
    height: 18,
  },
  mapTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 780,
    letterSpacing: 0,
  },
  mapSection: {
    display: "grid",
    gap: 3,
    padding: 8,
  },
  mapDivider: {
    borderTop: "1px solid var(--gbpr-border-soft)",
  },
  mapSectionTitle: {
    margin: "2px 6px 4px",
    color: "var(--gbpr-subtle)",
    fontSize: 9,
    fontWeight: 780,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  mapButton: {
    display: "grid",
    width: "100%",
    minHeight: 44,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    border: 0,
    borderRadius: 7,
    padding: "8px 9px",
    background: "transparent",
    textAlign: "left",
  },
  mapButtonLabel: {
    overflow: "hidden",
    fontSize: 11,
    fontWeight: 680,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  mapCount: {
    display: "grid",
    minWidth: 24,
    height: 22,
    placeItems: "center",
    borderRadius: 7,
    padding: "0 6px",
    color: "var(--gbpr-muted)",
    background: "var(--gbpr-border-soft)",
    fontSize: 9,
    fontWeight: 780,
  },
  catalogue: {
    display: "grid",
    flex: "999 1 620px",
    minWidth: 0,
    gap: 10,
  },
  catalogueHeader: {
    display: "flex",
    minHeight: 54,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    padding: "8px 10px 8px 14px",
    background: "var(--gbpr-panel)",
  },
  resultTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 760,
    letterSpacing: 0,
  },
  resultCopy: {
    margin: "2px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 10,
  },
  catalogueActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  category: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    background: "var(--gbpr-panel)",
    boxShadow: "0 4px 14px rgba(15, 31, 56, 0.035)",
  },
  categoryHeader: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "44px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: "7px 9px",
    background: "#FBFCFE",
  },
  groupCheckbox: {
    display: "grid",
    width: 44,
    height: 44,
    placeItems: "center",
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    margin: 0,
    accentColor: "var(--gbpr-blue)",
  },
  categoryToggle: {
    display: "grid",
    minWidth: 0,
    minHeight: 44,
    gridTemplateColumns: "18px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    border: 0,
    padding: "4px 6px",
    background: "transparent",
    textAlign: "left",
  },
  toggleIcon: {
    width: 16,
    height: 16,
    color: "var(--gbpr-subtle)",
  },
  categoryName: {
    overflow: "hidden",
    fontSize: 13,
    fontWeight: 780,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  categoryMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 6,
    color: "var(--gbpr-muted)",
    fontSize: 10,
    fontWeight: 650,
  },
  categoryAction: {
    minWidth: 112,
  },
  productList: {
    display: "grid",
    minWidth: 0,
    overflowX: "auto",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  productRow: {
    display: "grid",
    minWidth: 620,
    minHeight: 58,
    gridTemplateColumns:
      "44px minmax(150px, 1.5fr) minmax(100px, 1fr) 88px 92px 94px",
    alignItems: "center",
    gap: 10,
    borderTop: "1px solid var(--gbpr-border-soft)",
    padding: "6px 12px 6px 9px",
    contentVisibility: "auto",
    containIntrinsicSize: "auto 58px",
  },
  productSelect: {
    display: "grid",
    width: 44,
    height: 44,
    placeItems: "center",
    cursor: "pointer",
  },
  productIdentity: {
    display: "grid",
    minWidth: 0,
    gap: 2,
  },
  productName: {
    overflow: "hidden",
    fontSize: 11,
    fontWeight: 740,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  productDetail: {
    overflow: "hidden",
    color: "var(--gbpr-muted)",
    fontSize: 9,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowValue: {
    overflow: "hidden",
    color: "var(--gbpr-muted)",
    fontSize: 10,
    fontWeight: 620,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowPrice: {
    color: "var(--gbpr-ink)",
    fontSize: 11,
    fontWeight: 760,
  },
  status: {
    display: "inline-flex",
    width: "fit-content",
    minHeight: 24,
    alignItems: "center",
    gap: 5,
    borderRadius: 7,
    padding: "3px 7px",
    color: "var(--gbpr-muted)",
    background: "var(--gbpr-border-soft)",
    fontSize: 9,
    fontWeight: 760,
  },
  statusIcon: {
    width: 12,
    height: 12,
  },
  emptyGroup: {
    display: "flex",
    minHeight: 62,
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    color: "var(--gbpr-muted)",
    fontSize: 11,
  },
  emptyIcon: {
    width: 17,
    height: 17,
    color: "var(--gbpr-subtle)",
  },
};

function cloneProducts(products: readonly ProductRecord[]): ProductRecord[] {
  return products.map((product) => ({ ...product }));
}

function isLowStock(product: ProductRecord): boolean {
  return getProductStatus(product) === "low-stock";
}

function isMissingVendor(product: ProductRecord): boolean {
  return !product.vendor.trim() || product.vendor === "Unassigned";
}

function averagePrice(products: readonly ProductRecord[]): string {
  if (products.length === 0) return "No average";
  const total = products.reduce((sum, product) => sum + product.price, 0);
  return MONEY.format(total / products.length);
}

function viewLabel(view: CatalogueView): string {
  if (view === "all") return "All products";
  if (view === "low-stock") return "Low stock";
  if (view === "missing-vendor") return "Missing vendor";
  return view;
}

function productIdentity(
  product: Pick<ProductRecord, "name" | "vendor" | "mgSize">,
): string {
  return [product.name, product.vendor, product.mgSize]
    .map((value) => value.trim().toLowerCase())
    .join("\u001f");
}

function createImportCandidates(
  mode: Exclude<ToolState, "add" | null>,
  products: readonly ProductRecord[],
): ImportCandidate[] {
  const first = products[0];
  const second = products[1] ?? first;
  const incoming: ImportCandidate[] = [];

  if (first) {
    incoming.push({
      name: first.name,
      vendor: first.vendor,
      mgSize: first.mgSize,
      price: first.price,
    });
  }
  if (second) {
    incoming.push({
      name: second.name,
      vendor: second.vendor,
      mgSize: second.mgSize,
      price: second.price + 4,
    });
  }

  incoming.push({
    name: mode === "csv" ? "Mazdutide Import" : "Cagrilintide Extract",
    vendor: mode === "csv" ? "QSC" : "Unassigned",
    mgSize: mode === "csv" ? "10 mg" : "5 mg",
    price: mode === "csv" ? 63.5 : 71,
  });

  return incoming;
}

export default function CategoryWorkbench() {
  const productSequenceRef = useRef(1);
  const [products, setProducts] = useState<ProductRecord[]>(() =>
    cloneProducts(SAMPLE_PRODUCTS),
  );
  const [activeView, setActiveView] = useState<CatalogueView>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<Category>>(
    () => new Set(CATEGORIES),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [tool, setTool] = useState<ToolState>(null);
  const [importRows, setImportRows] = useState<ImportReviewRow[]>([]);
  const [groupConfirmation, setGroupConfirmation] =
    useState<GroupConfirmation>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          products.filter((product) => product.category === category).length,
        ]),
      ) as Record<Category, number>,
    [products],
  );

  const exceptionCounts = useMemo(
    () => ({
      "low-stock": products.filter(isLowStock).length,
      "missing-vendor": products.filter(isMissingVendor).length,
    }),
    [products],
  );

  const filteredProducts = useMemo(() => {
    if (activeView === "all") return products;
    if (activeView === "low-stock") return products.filter(isLowStock);
    if (activeView === "missing-vendor") {
      return products.filter(isMissingVendor);
    }
    return products.filter((product) => product.category === activeView);
  }, [activeView, products]);

  const groupedProducts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          filteredProducts.filter((product) => product.category === category),
        ]),
      ) as Record<Category, ProductRecord[]>,
    [filteredProducts],
  );

  const allExpanded = expandedCategories.size === CATEGORIES.length;

  function selectView(view: CatalogueView) {
    setActiveView(view);
    setSelectedIds(new Set());
    if (CATEGORIES.includes(view as Category)) {
      setExpandedCategories((current) => new Set(current).add(view as Category));
    } else if (view !== "all") {
      setExpandedCategories(new Set(CATEGORIES));
    }
  }

  function toggleCategory(category: Category) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleCategorySelection(category: Category, checked: boolean) {
    const categoryIds = groupedProducts[category].map((product) => product.id);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of categoryIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleProductSelection(productId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }

  function requestGroupEdit(category: Category) {
    const categoryProducts = groupedProducts[category];
    const selectedCategoryIds = categoryProducts
      .filter((product) => selectedIds.has(product.id))
      .map((product) => product.id);
    const productIds = selectedCategoryIds.length
      ? selectedCategoryIds
      : categoryProducts.map((product) => product.id);
    const affectedProducts = products.filter((product) =>
      productIds.includes(product.id),
    );
    const nextVisibility = !affectedProducts.every((product) => product.visible);

    if (productIds.length === 0) return;
    setGroupConfirmation({ category, productIds, nextVisibility });
  }

  function confirmGroupEdit() {
    if (!groupConfirmation) return;
    const previousProducts = cloneProducts(products);
    const count = groupConfirmation.productIds.length;
    const stateLabel = groupConfirmation.nextVisibility ? "visible" : "hidden";
    const nextProducts = applyBulkPatch(
      products,
      groupConfirmation.productIds,
      {
        visible: groupConfirmation.nextVisibility,
        lastEdited: new Date().toISOString(),
      },
    );

    setProducts(nextProducts);
    setSelectedIds(new Set());
    setFeedback({
      message: `${count} ${groupConfirmation.category} ${count === 1 ? "product" : "products"} set to ${stateLabel}.`,
      previousProducts,
    });
    setGroupConfirmation(null);
  }

  function openImport(mode: "csv" | "ai") {
    setImportRows(classifyImportRows(products, createImportCandidates(mode, products)));
    setTool(mode);
  }

  function editImportRow(
    rowId: ImportReviewRow["id"],
    patch: Partial<Pick<ImportReviewRow, "name" | "price" | "vendor" | "mgSize">>,
  ) {
    setImportRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function confirmImport() {
    const previousProducts = cloneProducts(products);
    const acceptedRows = importRows.filter((row) => row.included);
    let nextProducts = cloneProducts(products);

    for (const row of acceptedRows) {
      const matchIndex = nextProducts.findIndex(
        (product) => productIdentity(product) === productIdentity(row),
      );
      if (matchIndex >= 0) {
        nextProducts[matchIndex] = {
          ...nextProducts[matchIndex],
          name: row.name,
          vendor: row.vendor,
          mgSize: row.mgSize,
          price: row.price,
          lastEdited: new Date().toISOString(),
        };
      } else {
        nextProducts.push({
          id: `category-import-${productSequenceRef.current++}`,
          name: row.name,
          description: "Imported catalogue product",
          vendor: row.vendor,
          category: "Other",
          mgSize: row.mgSize,
          price: row.price,
          stock: null,
          maxPerCustomer: null,
          halfKitEnabled: false,
          visible: true,
          lastEdited: new Date().toISOString(),
        });
      }
    }

    setProducts(nextProducts);
    setFeedback({
      message: `${acceptedRows.length} ${acceptedRows.length === 1 ? "product" : "products"} imported into the catalogue.`,
      previousProducts,
    });
    setTool(null);
    setImportRows([]);
  }

  function saveProduct(patch: Partial<Omit<ProductRecord, "id">>) {
    const previousProducts = cloneProducts(products);
    const nextProduct: ProductRecord = {
      id: `category-product-${productSequenceRef.current++}`,
      name: patch.name ?? "Untitled product",
      description: patch.description ?? "Catalogue product",
      vendor: patch.vendor ?? "Unassigned",
      category: patch.category ?? CATEGORIES[0],
      mgSize: patch.mgSize ?? "",
      price: patch.price ?? 0,
      stock: patch.stock ?? null,
      maxPerCustomer: patch.maxPerCustomer ?? null,
      halfKitEnabled: patch.halfKitEnabled ?? false,
      visible: patch.visible ?? true,
      lastEdited: new Date().toISOString(),
    };

    setProducts((current) => [...current, nextProduct]);
    setActiveView(nextProduct.category as Category);
    setExpandedCategories((current) =>
      new Set(current).add(nextProduct.category as Category),
    );
    setFeedback({ message: `${nextProduct.name} added.`, previousProducts });
    setTool(null);
  }

  function resetWorkbench() {
    setProducts((current) => resetProducts(current));
    setActiveView("all");
    setExpandedCategories(new Set(CATEGORIES));
    setSelectedIds(new Set());
    setTool(null);
    setImportRows([]);
    setGroupConfirmation(null);
    setFeedback(null);
  }

  return (
    <ProductShell
      concept="Category Workbench"
      pageTitle="Category Workbench"
      onReset={resetWorkbench}
    >
      <div style={STYLES.workspace}>
        <header style={STYLES.pageHeader}>
          <div>
            <h2 style={STYLES.pageHeading}>Category Workbench</h2>
            <p style={STYLES.pageCopy}>
              Organise {products.length} products for {GROUP_BUY_NAME} by catalogue
              group and operational exception.
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
              Import CSV
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
              onClick={() => setTool("add")}
            >
              <Plus aria-hidden="true" />
              Add Product
            </button>
          </div>
        </header>

        {tool === "add" ? (
          <ProductForm product={null} onSave={saveProduct} onCancel={() => setTool(null)} />
        ) : tool === "csv" || tool === "ai" ? (
          <ImportReview
            rows={importRows}
            mode={tool}
            onToggle={(rowId) =>
              setImportRows((current) =>
                current.map((row) =>
                  row.id === rowId ? { ...row, included: !row.included } : row,
                ),
              )
            }
            onEdit={editImportRow}
            onConfirm={confirmImport}
            onCancel={() => {
              setTool(null);
              setImportRows([]);
            }}
          />
        ) : (
          <div style={STYLES.workbench}>
            <aside aria-label="Catalogue map" style={STYLES.map}>
              <header style={STYLES.mapHeader}>
                <FolderTree aria-hidden="true" style={STYLES.mapIcon} />
                <h3 style={STYLES.mapTitle}>Catalogue map</h3>
              </header>

              <nav aria-label="Product categories" style={STYLES.mapSection}>
                <button
                  type="button"
                  style={{
                    ...STYLES.mapButton,
                    color: activeView === "all" ? "var(--gbpr-navy)" : "var(--gbpr-ink)",
                    background:
                      activeView === "all" ? "rgba(45, 107, 204, 0.1)" : "transparent",
                  }}
                  aria-pressed={activeView === "all"}
                  onClick={() => selectView("all")}
                >
                  <span style={STYLES.mapButtonLabel}>All products</span>
                  <span style={STYLES.mapCount}>{products.length}</span>
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    type="button"
                    style={{
                      ...STYLES.mapButton,
                      color:
                        activeView === category ? "var(--gbpr-navy)" : "var(--gbpr-ink)",
                      background:
                        activeView === category
                          ? "rgba(45, 107, 204, 0.1)"
                          : "transparent",
                    }}
                    aria-pressed={activeView === category}
                    onClick={() => selectView(category)}
                    key={category}
                  >
                    <span style={STYLES.mapButtonLabel}>{category}</span>
                    <span style={STYLES.mapCount}>{categoryCounts[category]}</span>
                  </button>
                ))}
              </nav>

              <section style={{ ...STYLES.mapSection, ...STYLES.mapDivider }}>
                <h4 style={STYLES.mapSectionTitle}>Saved views</h4>
                {(
                  [
                    ["low-stock", "Low stock"],
                    ["missing-vendor", "Missing vendor"],
                  ] as const
                ).map(([view, label]) => (
                  <button
                    type="button"
                    style={{
                      ...STYLES.mapButton,
                      color:
                        activeView === view ? "var(--gbpr-navy)" : "var(--gbpr-ink)",
                      background:
                        activeView === view
                          ? "rgba(45, 107, 204, 0.1)"
                          : "transparent",
                    }}
                    aria-pressed={activeView === view}
                    onClick={() => selectView(view)}
                    key={view}
                  >
                    <span style={STYLES.mapButtonLabel}>{label}</span>
                    <span style={STYLES.mapCount}>{exceptionCounts[view]}</span>
                  </button>
                ))}
              </section>
            </aside>

            <section aria-label={`${viewLabel(activeView)} catalogue`} style={STYLES.catalogue}>
              <header style={STYLES.catalogueHeader}>
                <div>
                  <h3 style={STYLES.resultTitle}>{viewLabel(activeView)}</h3>
                  <p style={STYLES.resultCopy}>
                    {filteredProducts.length} of {products.length} products in this view
                  </p>
                </div>
                <div style={STYLES.catalogueActions}>
                  {activeView !== "all" ? (
                    <button
                      type="button"
                      className="gbpr-button"
                      data-variant="ghost"
                      onClick={() => selectView("all")}
                    >
                      Clear view
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    onClick={() =>
                      setExpandedCategories(
                        allExpanded ? new Set() : new Set(CATEGORIES),
                      )
                    }
                  >
                    <Layers3 aria-hidden="true" />
                    {allExpanded ? "Collapse all" : "Expand all"}
                  </button>
                </div>
              </header>

              {CATEGORIES.map((category) => {
                const categoryProducts = groupedProducts[category];
                const expanded = expandedCategories.has(category);
                const selectedCount = categoryProducts.filter((product) =>
                  selectedIds.has(product.id),
                ).length;
                const allSelected =
                  categoryProducts.length > 0 &&
                  selectedCount === categoryProducts.length;
                const regionId = `category-${category
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`;

                return (
                  <section style={STYLES.category} key={category}>
                    <header style={STYLES.categoryHeader}>
                      <label style={STYLES.groupCheckbox}>
                        <span className="gbpr-visually-hidden">
                          Select all {category} products in this view
                        </span>
                        <input
                          type="checkbox"
                          style={STYLES.checkbox}
                          checked={allSelected}
                          disabled={categoryProducts.length === 0}
                          onChange={(event) =>
                            toggleCategorySelection(
                              category,
                              event.currentTarget.checked,
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        style={STYLES.categoryToggle}
                        aria-expanded={expanded}
                        aria-controls={regionId}
                        onClick={() => toggleCategory(category)}
                      >
                        {expanded ? (
                          <ChevronDown aria-hidden="true" style={STYLES.toggleIcon} />
                        ) : (
                          <ChevronRight aria-hidden="true" style={STYLES.toggleIcon} />
                        )}
                        <span style={STYLES.categoryName}>{category}</span>
                        <span style={STYLES.categoryMeta}>
                          <span>
                            {categoryProducts.length} {categoryProducts.length === 1 ? "product" : "products"}
                          </span>
                          <span>Avg {averagePrice(categoryProducts)}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="gbpr-button"
                        data-variant="secondary"
                        data-testid="category-bulk-action"
                        style={STYLES.categoryAction}
                        disabled={categoryProducts.length === 0}
                        onClick={() => requestGroupEdit(category)}
                      >
                        {categoryProducts.every((product) => product.visible) ? (
                          <EyeOff aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                        Edit group
                        {selectedCount > 0 ? ` (${selectedCount})` : ""}
                      </button>
                    </header>

                    {expanded ? (
                      <div id={regionId}>
                        {categoryProducts.length > 0 ? (
                          <ul style={STYLES.productList}>
                            {categoryProducts.map((product) => {
                              const status = getProductStatus(product);
                              const statusLabel =
                                status === "paused"
                                  ? "Hidden"
                                  : status === "low-stock"
                                    ? "Low stock"
                                    : status === "out-of-stock"
                                      ? "Out of stock"
                                      : "Live";
                              return (
                                <li style={STYLES.productRow} key={product.id}>
                                  <label style={STYLES.productSelect}>
                                    <span className="gbpr-visually-hidden">
                                      Select product {product.name}
                                    </span>
                                    <input
                                      type="checkbox"
                                      style={STYLES.checkbox}
                                      checked={selectedIds.has(product.id)}
                                      onChange={(event) =>
                                        toggleProductSelection(
                                          product.id,
                                          event.currentTarget.checked,
                                        )
                                      }
                                    />
                                  </label>
                                  <span style={STYLES.productIdentity}>
                                    <strong style={STYLES.productName}>{product.name}</strong>
                                    <small style={STYLES.productDetail}>{product.description}</small>
                                  </span>
                                  <span style={STYLES.rowValue}>{product.vendor || "No vendor"}</span>
                                  <span style={STYLES.rowValue}>{product.mgSize}</span>
                                  <strong style={STYLES.rowPrice}>{MONEY.format(product.price)}</strong>
                                  <span style={STYLES.status}>
                                    <Boxes aria-hidden="true" style={STYLES.statusIcon} />
                                    {product.stock === null ? "Unlimited" : product.stock}
                                    <span className="gbpr-visually-hidden">, {statusLabel}</span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div style={STYLES.emptyGroup}>
                            <PackageOpen aria-hidden="true" style={STYLES.emptyIcon} />
                            No {category} products in this view.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </section>
          </div>
        )}
      </div>

      <ConfirmAction
        open={groupConfirmation !== null}
        title={
          groupConfirmation
            ? `Update ${groupConfirmation.category} group?`
            : "Update category group?"
        }
        description={
          groupConfirmation
            ? `This will set ${groupConfirmation.productIds.length} ${groupConfirmation.productIds.length === 1 ? "product" : "products"} to ${groupConfirmation.nextVisibility ? "visible" : "hidden"}.`
            : "Confirm the category group update."
        }
        confirmLabel={
          groupConfirmation
            ? `Update ${groupConfirmation.productIds.length} ${groupConfirmation.productIds.length === 1 ? "product" : "products"}`
            : "Update group"
        }
        tone="primary"
        onConfirm={confirmGroupEdit}
        onCancel={() => setGroupConfirmation(null)}
      />

      {feedback ? (
        <MockFeedback
          message={feedback.message}
          onUndo={() => {
            setProducts(cloneProducts(feedback.previousProducts));
            setFeedback(null);
          }}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </ProductShell>
  );
}
