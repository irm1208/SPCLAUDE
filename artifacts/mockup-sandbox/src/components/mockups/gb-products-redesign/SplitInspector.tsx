import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileSpreadsheet,
  FilterX,
  PackageOpen,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  CATEGORIES,
  GROUP_BUY_NAME,
  SAMPLE_PRODUCTS,
  VENDORS,
  type ImportCandidate,
  type ImportReviewRow,
  type ProductFilters,
  type ProductRecord,
  type ProductStatus,
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
  filterProducts,
  getProductStatus,
  resetProducts,
} from "./_shared/model";
import {
  findDirtyImportConflict,
  pinSelectedProduct,
} from "./_shared/split-inspector-model";
import "./_group.css";

type ImportMode = "csv" | "ai";

type ProductDraft = {
  name: string;
  price: string;
  vendor: string;
  category: string;
  mgSize: string;
  stock: string;
  maxPerCustomer: string;
  visible: boolean;
  halfKitEnabled: boolean;
};

type DraftErrors = Partial<
  Record<"name" | "price" | "vendor" | "stock" | "maxPerCustomer", string>
>;

type BulkOperation =
  | { kind: "stock"; value: string }
  | { kind: "vendor"; value: string }
  | { kind: "delete" };

type ConfirmationState =
  | { kind: "switch"; productId: string }
  | { kind: "delete-product"; productId: string }
  | { kind: "bulk"; operation: BulkOperation; ids: string[] }
  | { kind: "import"; mode: ImportMode; count: number }
  | {
      kind: "import-conflict";
      mode: ImportMode;
      count: number;
      productId: string;
    };

type ViewSnapshot = {
  query: string;
  vendor: string;
  category: string;
  stock: ProductFilters["stock"];
  selectedId: string | null;
  selectedIds: string[];
  draft: ProductDraft | null;
  dirty: boolean;
  errors: DraftErrors;
};

type FeedbackState = {
  message: string;
  products: ProductRecord[];
  view: ViewSnapshot;
};

type CommitOptions = {
  selectedIds?: ReadonlySet<string>;
  preferredSelectedId?: string | null;
  refreshDraft?: boolean;
};

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const STATUS_LABELS: Record<ProductStatus, string> = {
  live: "Live",
  paused: "Hidden",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

function cloneProducts(products: readonly ProductRecord[]): ProductRecord[] {
  return products.map((product) => ({ ...product }));
}

function createDraft(product: ProductRecord | null | undefined): ProductDraft | null {
  if (!product) return null;

  return {
    name: product.name,
    price: String(product.price),
    vendor: product.vendor,
    category: product.category,
    mgSize: product.mgSize,
    stock: product.stock === null ? "" : String(product.stock),
    maxPerCustomer:
      product.maxPerCustomer === null ? "" : String(product.maxPerCustomer),
    visible: product.visible,
    halfKitEnabled: product.halfKitEnabled,
  };
}

function validateDraft(draft: ProductDraft): DraftErrors {
  const errors: DraftErrors = {};
  const price = Number(draft.price);

  if (!draft.name.trim()) errors.name = "Enter a product name.";
  if (!draft.vendor.trim()) errors.vendor = "Choose a vendor.";
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
    errors.price = "Enter a finite price of zero or more.";
  }

  if (draft.stock.trim()) {
    const stock = Number(draft.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = "Use a whole stock number or leave blank for unlimited.";
    }
  }

  if (draft.maxPerCustomer.trim()) {
    const maximum = Number(draft.maxPerCustomer);
    if (!Number.isInteger(maximum) || maximum < 1) {
      errors.maxPerCustomer = "Use a whole maximum or leave blank for no limit.";
    }
  }

  return errors;
}

function productIdentity(
  product: Pick<ProductRecord, "name" | "vendor" | "mgSize">,
): string {
  return [product.name, product.vendor, product.mgSize]
    .map((value) => value.trim().toLowerCase())
    .join("\u001f");
}

function candidateFromProduct(product: ProductRecord): ImportCandidate {
  return {
    name: product.name,
    vendor: product.vendor,
    mgSize: product.mgSize,
    price: product.price,
  };
}

function createNewImportCandidate(
  mode: ImportMode,
  existing: readonly ProductRecord[],
): ImportCandidate {
  const baseName = mode === "csv" ? "Mazdutide Preview" : "Cagrilintide Preview";
  let sequence = 1;
  let candidate: ImportCandidate;

  do {
    candidate = {
      name: sequence === 1 ? baseName : `${baseName} ${sequence}`,
      vendor: mode === "csv" ? "QSC" : "Unassigned",
      mgSize: mode === "csv" ? "10 mg" : "5 mg",
      price: mode === "csv" ? 63.5 : 71,
    };
    sequence += 1;
  } while (
    existing.some(
      (product) => productIdentity(product) === productIdentity(candidate),
    )
  );

  return candidate;
}

function reclassifyImportRows(
  existing: readonly ProductRecord[],
  rows: readonly ImportReviewRow[],
): ImportReviewRow[] {
  const candidates: ImportCandidate[] = rows.map(
    ({ name, vendor, mgSize, price }) => ({ name, vendor, mgSize, price }),
  );
  const classified = classifyImportRows(existing, candidates);

  return classified.map((next, index) => {
    const current = rows[index];
    return {
      ...next,
      id: current.id,
      included: next.status === "duplicate" ? false : current.included,
    };
  });
}

function stockLabel(product: ProductRecord): string {
  if (product.stock === null) return "Unlimited";
  if (product.stock === 1) return "1 in stock";
  return `${product.stock} in stock`;
}

export default function SplitInspector() {
  const inspectorId = useId();
  const inspectorFormRef = useRef<HTMLFormElement>(null);
  const catalogueRef = useRef<HTMLUListElement>(null);
  const productSequenceRef = useRef(1);

  const [products, setProducts] = useState<ProductRecord[]>(() =>
    cloneProducts(SAMPLE_PRODUCTS),
  );
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("all");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<ProductFilters["stock"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    SAMPLE_PRODUCTS[0]?.id ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<ProductDraft | null>(() =>
    createDraft(SAMPLE_PRODUCTS[0]),
  );
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [importRows, setImportRows] = useState<ImportReviewRow[]>([]);
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [bulkStock, setBulkStock] = useState("");
  const [bulkVendor, setBulkVendor] = useState<string>(VENDORS[0]);
  const [bulkError, setBulkError] = useState("");

  const filters = useMemo<ProductFilters>(
    () => ({ query, vendor, category, stock }),
    [category, query, stock, vendor],
  );
  const filteredProducts = useMemo(
    () => filterProducts(products, filters),
    [filters, products],
  );
  const selectedProduct =
    products.find((product) => product.id === selectedId) ?? null;
  const listedProducts = useMemo(
    () =>
      pinSelectedProduct(filteredProducts, selectedProduct, selectedId, dirty),
    [dirty, filteredProducts, selectedId, selectedProduct],
  );
  const selectedProductPinned =
    dirty &&
    selectedProduct !== null &&
    !filteredProducts.some((product) => product.id === selectedProduct.id);
  const hasActiveFilters =
    Boolean(query.trim()) || vendor !== "all" || category !== "all" || stock !== "all";
  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedIds.has(product.id));
  const activeFilterSummary = [
    query.trim() ? `Search: "${query.trim()}"` : "",
    vendor !== "all" ? `Vendor: ${vendor}` : "",
    category !== "all" ? `Category: ${category}` : "",
    stock !== "all" ? `Stock: ${stock}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  function snapshotView(): ViewSnapshot {
    return {
      query,
      vendor,
      category,
      stock,
      selectedId,
      selectedIds: [...selectedIds],
      draft: draft ? { ...draft } : null,
      dirty,
      errors: { ...errors },
    };
  }

  function selectProductNow(productId: string | null) {
    const product = products.find((item) => item.id === productId) ?? null;
    setSelectedId(product?.id ?? null);
    setDraft(createDraft(product));
    setDirty(false);
    setErrors({});
  }

  function commitProducts(
    nextProductsInput: readonly ProductRecord[],
    message: string,
    options: CommitOptions = {},
  ) {
    const nextProducts = cloneProducts(nextProductsInput);
    const availableIds = new Set(nextProducts.map((product) => product.id));
    const nextBulkSelection = options.selectedIds
      ? new Set([...options.selectedIds].filter((id) => availableIds.has(id)))
      : new Set([...selectedIds].filter((id) => availableIds.has(id)));
    const preferredSelectedId = Object.prototype.hasOwnProperty.call(
      options,
      "preferredSelectedId",
    )
      ? options.preferredSelectedId ?? null
      : selectedId;
    const visibleProducts = filterProducts(nextProducts, filters);
    const currentStillExists =
      preferredSelectedId !== null && availableIds.has(preferredSelectedId);
    const preferredRemainsVisible = visibleProducts.some(
      (product) => product.id === preferredSelectedId,
    );
    const preserveFilteredDirtyDraft = dirty && !options.refreshDraft;
    const nextEditorId =
      currentStillExists &&
      (preferredRemainsVisible || preserveFilteredDirtyDraft)
      ? preferredSelectedId
      : (visibleProducts[0]?.id ?? null);
    const nextEditorProduct =
      nextProducts.find((product) => product.id === nextEditorId) ?? null;
    const editorChanged = nextEditorId !== selectedId;

    setFeedback({
      message,
      products: cloneProducts(products),
      view: snapshotView(),
    });
    setProducts(nextProducts);
    setSelectedIds(nextBulkSelection);
    setSelectedId(nextEditorId);

    if (editorChanged || options.refreshDraft || !dirty) {
      setDraft(createDraft(nextEditorProduct));
      setDirty(false);
      setErrors({});
    }
  }

  function updateFilters(nextFilters: ProductFilters) {
    setQuery(nextFilters.query);
    setVendor(nextFilters.vendor);
    setCategory(nextFilters.category);
    setStock(nextFilters.stock);

    const nextVisibleProducts = filterProducts(products, nextFilters);
    const selectedRemainsVisible = nextVisibleProducts.some(
      (product) => product.id === selectedId,
    );
    if (!dirty && !selectedRemainsVisible) {
      const nextProduct = nextVisibleProducts[0] ?? null;
      setSelectedId(nextProduct?.id ?? null);
      setDraft(createDraft(nextProduct));
      setErrors({});
    }
  }

  function clearFilters() {
    updateFilters({ query: "", vendor: "all", category: "all", stock: "all" });
  }

  function requestProductSwitch(productId: string) {
    if (productId === selectedId) return;
    if (dirty) {
      setPendingSwitchId(productId);
      setConfirmationState({ kind: "switch", productId });
      return;
    }
    selectProductNow(productId);
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    rowIndex: number,
  ) {
    const target = event.target as HTMLElement;
    if (target.matches("input, textarea, select, [contenteditable='true']")) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const offset = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(
      listedProducts.length - 1,
      Math.max(0, rowIndex + offset),
    );
    if (nextIndex === rowIndex) return;

    event.preventDefault();
    requestProductSwitch(listedProducts[nextIndex].id);
    requestAnimationFrame(() => {
      catalogueRef.current
        ?.querySelector<HTMLButtonElement>(`[data-split-row-index="${nextIndex}"]`)
        ?.focus();
    });
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
      for (const product of filteredProducts) {
        if (allVisibleSelected) next.delete(product.id);
        else next.add(product.id);
      }
      return next;
    });
  }

  function updateDraft<Key extends keyof ProductDraft>(
    field: Key,
    value: ProductDraft[Key],
  ) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setDirty(true);
  }

  function clearDraftError(field: keyof DraftErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !selectedProduct) return;

    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      requestAnimationFrame(() => {
        inspectorFormRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    const savedProduct: ProductRecord = {
      ...selectedProduct,
      name: draft.name.trim(),
      price: Number(draft.price),
      vendor: draft.vendor.trim(),
      category: draft.category,
      mgSize: draft.mgSize.trim(),
      stock: draft.stock.trim() ? Number(draft.stock) : null,
      maxPerCustomer: draft.maxPerCustomer.trim()
        ? Number(draft.maxPerCustomer)
        : null,
      visible: draft.visible,
      halfKitEnabled: draft.halfKitEnabled,
      lastEdited: new Date().toISOString(),
    };
    const nextProducts = products.map((product) =>
      product.id === savedProduct.id ? savedProduct : { ...product },
    );
    commitProducts(nextProducts, `${savedProduct.name} saved.`, {
      preferredSelectedId: savedProduct.id,
      refreshDraft: true,
    });
  }

  function createLocalProductId(
    prefix: "split-product" | "split-import",
    catalogue: readonly ProductRecord[],
  ): string {
    let candidate: string;
    do {
      candidate = `${prefix}-${String(productSequenceRef.current++).padStart(3, "0")}`;
    } while (catalogue.some((product) => product.id === candidate));
    return candidate;
  }

  function handleAddProduct(patch: Partial<Omit<ProductRecord, "id">>) {
    const nextProduct: ProductRecord = {
      id: createLocalProductId("split-product", products),
      name: patch.name ?? "Untitled product",
      description: patch.description ?? "Added in the Split Inspector preview.",
      vendor: patch.vendor ?? "Unassigned",
      category: patch.category ?? "Other",
      mgSize: patch.mgSize ?? "",
      price: patch.price ?? 0,
      stock: patch.stock ?? null,
      maxPerCustomer: patch.maxPerCustomer ?? null,
      halfKitEnabled: patch.halfKitEnabled ?? false,
      visible: patch.visible ?? true,
      lastEdited: new Date().toISOString(),
    };
    commitProducts([...products, nextProduct], `${nextProduct.name} added.`, {
      preferredSelectedId: dirty ? selectedId : nextProduct.id,
    });
    setAddMode(false);
  }

  function openImport(mode: ImportMode) {
    const existing = products.length ? products : SAMPLE_PRODUCTS;
    const duplicate = existing[existing.length - 1];
    const incoming: ImportCandidate[] = [
      candidateFromProduct(duplicate),
      { ...candidateFromProduct(duplicate), price: duplicate.price + 7.5 },
      createNewImportCandidate(mode, existing),
    ];

    setImportRows(classifyImportRows(existing, incoming));
    setImportMode(mode);
    setAddMode(false);
  }

  function requestImportConfirmation() {
    if (!importMode) return;
    const includedCount = importRows.filter((row) => row.included).length;
    if (includedCount === 0) return;
    setConfirmationState({
      kind: "import",
      mode: importMode,
      count: includedCount,
    });
  }

  function confirmImport(rebaseSelectedId: string | null = null) {
    const includedRows = importRows.filter((row) => row.included);
    const nextProducts = cloneProducts(products);

    for (const row of includedRows) {
      const existingIndex = nextProducts.findIndex(
        (product) => productIdentity(product) === productIdentity(row),
      );
      if (existingIndex >= 0) {
        nextProducts[existingIndex] = {
          ...nextProducts[existingIndex],
          name: row.name.trim(),
          vendor: row.vendor.trim(),
          mgSize: row.mgSize.trim(),
          price: row.price,
          lastEdited: new Date().toISOString(),
        };
      } else {
        nextProducts.push({
          id: createLocalProductId("split-import", nextProducts),
          name: row.name.trim(),
          description: "Imported into the Split Inspector preview.",
          vendor: row.vendor.trim(),
          category: "Other",
          mgSize: row.mgSize.trim(),
          price: row.price,
          stock: 0,
          maxPerCustomer: null,
          halfKitEnabled: false,
          visible: true,
          lastEdited: new Date().toISOString(),
        });
      }
    }

    commitProducts(
      nextProducts,
      `${includedRows.length} imported ${includedRows.length === 1 ? "product" : "products"} applied.`,
      rebaseSelectedId
        ? {
            preferredSelectedId: rebaseSelectedId,
            refreshDraft: true,
          }
        : undefined,
    );
    setImportMode(null);
    setImportRows([]);
  }

  function requestBulkOperation(operation: BulkOperation) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (operation.kind === "stock") {
      const stockValue = Number(operation.value);
      if (
        operation.value.trim() &&
        (!Number.isInteger(stockValue) || stockValue < 0)
      ) {
        setBulkError("Use a whole stock number or leave blank for unlimited.");
        return;
      }
    }

    setBulkError("");
    setConfirmationState({ kind: "bulk", operation, ids });
  }

  function applyConfirmedBulkChange(
    operation: BulkOperation,
    ids: readonly string[],
  ) {
    const idSet = new Set(ids);
    if (operation.kind === "delete") {
      const nextProducts = products.filter((product) => !idSet.has(product.id));
      commitProducts(nextProducts, `${ids.length} selected products deleted.`, {
        selectedIds: new Set(),
      });
      return;
    }

    const patch =
      operation.kind === "stock"
        ? {
            stock: operation.value.trim() ? Number(operation.value) : null,
            lastEdited: new Date().toISOString(),
          }
        : {
            vendor: operation.value,
            lastEdited: new Date().toISOString(),
          };
    const nextProducts = applyBulkPatch(products, idSet, patch);
    commitProducts(nextProducts, `${ids.length} selected products updated.`, {
      selectedIds: new Set(),
    });
    if (dirty && selectedId && idSet.has(selectedId)) {
      setDraft((current) => {
        if (!current) return current;
        return operation.kind === "stock"
          ? { ...current, stock: operation.value }
          : { ...current, vendor: operation.value };
      });
      setErrors((current) => {
        const next = { ...current };
        if (operation.kind === "stock") delete next.stock;
        else delete next.vendor;
        return next;
      });
    }
  }

  function deleteOneProduct(productId: string) {
    const target = products.find((product) => product.id === productId);
    if (!target) return;
    const remainingSelection = new Set(
      [...selectedIds].filter((id) => id !== productId),
    );
    commitProducts(
      products.filter((product) => product.id !== productId),
      `${target.name} deleted.`,
      { selectedIds: remainingSelection },
    );
  }

  function confirmCurrentAction() {
    if (!confirmationState) return;

    if (confirmationState.kind === "switch") {
      selectProductNow(pendingSwitchId ?? confirmationState.productId);
      setPendingSwitchId(null);
    } else if (confirmationState.kind === "delete-product") {
      deleteOneProduct(confirmationState.productId);
    } else if (confirmationState.kind === "bulk") {
      applyConfirmedBulkChange(
        confirmationState.operation,
        confirmationState.ids,
      );
    } else if (confirmationState.kind === "import") {
      const conflict = findDirtyImportConflict(
        products,
        selectedId,
        dirty ? draft : null,
        importRows,
      );
      if (conflict && selectedId) {
        setConfirmationState({
          kind: "import-conflict",
          mode: confirmationState.mode,
          count: confirmationState.count,
          productId: selectedId,
        });
        return;
      }
      confirmImport();
    } else {
      confirmImport(confirmationState.productId);
    }

    setConfirmationState(null);
  }

  function cancelConfirmation() {
    if (confirmationState?.kind === "switch") setPendingSwitchId(null);
    setConfirmationState(null);
  }

  function resetPreview() {
    const restoredProducts = resetProducts(products);
    const firstProduct = restoredProducts[0] ?? null;
    setFeedback({
      message: "Preview reset to the 120 sample products.",
      products: cloneProducts(products),
      view: snapshotView(),
    });
    setProducts(restoredProducts);
    setQuery("");
    setVendor("all");
    setCategory("all");
    setStock("all");
    setSelectedId(firstProduct?.id ?? null);
    setSelectedIds(new Set());
    setDraft(createDraft(firstProduct));
    setDirty(false);
    setErrors({});
    setPendingSwitchId(null);
    setAddMode(false);
    setImportMode(null);
    setImportRows([]);
    setConfirmationState(null);
    setBulkStock("");
    setBulkVendor(VENDORS[0]);
    setBulkError("");
  }

  function undoLastChange() {
    if (!feedback) return;
    const { view } = feedback;
    setProducts(cloneProducts(feedback.products));
    setQuery(view.query);
    setVendor(view.vendor);
    setCategory(view.category);
    setStock(view.stock);
    setSelectedId(view.selectedId);
    setSelectedIds(new Set(view.selectedIds));
    setDraft(view.draft ? { ...view.draft } : null);
    setDirty(view.dirty);
    setErrors({ ...view.errors });
    setPendingSwitchId(null);
    setAddMode(false);
    setImportMode(null);
    setImportRows([]);
    setConfirmationState(null);
    setBulkError("");
    setFeedback(null);
  }

  const confirmationDetails = (() => {
    if (confirmationState?.kind === "switch") {
      const target = products.find(
        (product) => product.id === confirmationState.productId,
      );
      return {
        title: "Discard unsaved changes?",
        description: `Switch to ${target?.name ?? "the selected product"} and discard the current inspector draft?`,
        confirmLabel: "Discard and switch",
        tone: "danger" as const,
      };
    }
    if (confirmationState?.kind === "delete-product") {
      const target = products.find(
        (product) => product.id === confirmationState.productId,
      );
      return {
        title: "Delete product?",
        description: `Delete ${target?.name ?? "this product"} from the preview catalogue? You can undo this change afterward.`,
        confirmLabel: "Delete product",
        tone: "danger" as const,
      };
    }
    if (confirmationState?.kind === "bulk") {
      const deleting = confirmationState.operation.kind === "delete";
      return {
        title: deleting ? "Delete selected products?" : "Apply bulk change?",
        description: `${deleting ? "Delete" : "Update"} ${confirmationState.ids.length} selected products in ${GROUP_BUY_NAME}?`,
        confirmLabel: deleting ? "Delete products" : "Apply changes",
        tone: deleting ? ("danger" as const) : ("primary" as const),
      };
    }
    if (confirmationState?.kind === "import") {
      const source = confirmationState.mode === "csv" ? "CSV" : "AI Price List";
      return {
        title: "Confirm import?",
        description: `Import ${confirmationState.count} products from ${source} into ${GROUP_BUY_NAME}?`,
        confirmLabel: "Apply import",
        tone: "primary" as const,
      };
    }
    if (confirmationState?.kind === "import-conflict") {
      const target = products.find(
        (product) => product.id === confirmationState.productId,
      );
      return {
        title: "Import conflicts with unsaved changes",
        description: `The import updates ${target?.name ?? "the selected product"}. Apply ${confirmationState.count} imported ${confirmationState.count === 1 ? "product" : "products"} and replace the unsaved inspector draft with the imported values?`,
        confirmLabel: "Apply import and replace draft",
        tone: "danger" as const,
      };
    }
    return {
      title: "Confirm action",
      description: "Review this catalogue change before continuing.",
      confirmLabel: "Confirm",
      tone: "primary" as const,
    };
  })();

  return (
    <ProductShell concept="Split Inspector" pageTitle="Products" onReset={resetPreview}>
      <div className="gbpr-split-workspace">
        <header className="gbpr-split-page-header">
          <div>
            <span className="gbpr-eyebrow">Catalogue workspace</span>
            <h2>Products</h2>
            <p aria-live="polite">
              <strong>{products.length}</strong> products in {GROUP_BUY_NAME};{" "}
              <strong>{filteredProducts.length}</strong> in this view.
            </p>
          </div>
          <div className="gbpr-split-header-actions">
            <button
              type="button"
              className="gbpr-button"
              data-variant="primary"
              onClick={() => {
                setAddMode(true);
                setImportMode(null);
                setImportRows([]);
              }}
            >
              <Plus aria-hidden="true" />
              Add Product
            </button>
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
          </div>
        </header>

        {addMode ? (
          <ProductForm
            product={null}
            onSave={handleAddProduct}
            onCancel={() => setAddMode(false)}
          />
        ) : importMode ? (
          <ImportReview
            rows={importRows}
            mode={importMode}
            onToggle={(rowId) =>
              setImportRows((current) =>
                current.map((row) =>
                  row.id === rowId
                    ? { ...row, included: !row.included }
                    : row,
                ),
              )
            }
            onEdit={(rowId, patch) =>
              setImportRows((current) => {
                const nextRows = current.map((row) =>
                  row.id === rowId ? { ...row, ...patch } : row,
                );
                return reclassifyImportRows(
                  products.length ? products : SAMPLE_PRODUCTS,
                  nextRows,
                );
              })
            }
            onConfirm={requestImportConfirmation}
            onCancel={() => {
              setImportMode(null);
              setImportRows([]);
            }}
          />
        ) : (
          <>
            <section className="gbpr-split-filters" aria-label="Product filters">
              <label className="gbpr-split-search">
                <span className="gbpr-visually-hidden">Search products</span>
                <Search aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) =>
                    updateFilters({ ...filters, query: event.currentTarget.value })
                  }
                  placeholder="Search name, vendor, category"
                  autoComplete="off"
                />
              </label>
              <label>
                <span className="gbpr-visually-hidden">Filter by vendor</span>
                <select
                  aria-label="Filter by vendor"
                  value={vendor}
                  onChange={(event) =>
                    updateFilters({ ...filters, vendor: event.currentTarget.value })
                  }
                >
                  <option value="all">All vendors</option>
                  {VENDORS.map((vendorName) => (
                    <option value={vendorName} key={vendorName}>
                      {vendorName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="gbpr-visually-hidden">Filter by category</span>
                <select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(event) =>
                    updateFilters({
                      ...filters,
                      category: event.currentTarget.value,
                    })
                  }
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((categoryName) => (
                    <option value={categoryName} key={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="gbpr-visually-hidden">Filter by stock</span>
                <select
                  aria-label="Filter by stock"
                  value={stock}
                  onChange={(event) =>
                    updateFilters({
                      ...filters,
                      stock: event.currentTarget.value as ProductFilters["stock"],
                    })
                  }
                >
                  <option value="all">All stock</option>
                  <option value="available">Available</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </label>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="gbpr-button"
                  data-variant="ghost"
                  onClick={clearFilters}
                >
                  <FilterX aria-hidden="true" />
                  Clear filters
                </button>
              ) : null}
            </section>

            {selectedIds.size > 0 ? (
              <section
                className="gbpr-split-bulk-toolbar"
                data-testid="bulk-toolbar"
                aria-label="Bulk product actions"
              >
                <div className="gbpr-split-bulk-count">
                  <Boxes aria-hidden="true" />
                  <strong>{selectedIds.size} selected</strong>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="ghost"
                    aria-label="Clear product selection"
                    title="Clear selection"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
                <div className="gbpr-split-bulk-controls">
                  <label>
                    <span>Stock</span>
                    <input
                      value={bulkStock}
                      inputMode="numeric"
                      placeholder="Unlimited"
                      onChange={(event) => {
                        setBulkStock(event.currentTarget.value);
                        setBulkError("");
                      }}
                      aria-invalid={bulkError ? "true" : undefined}
                      aria-describedby={bulkError ? "gbpr-split-bulk-error" : undefined}
                    />
                  </label>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    onClick={() =>
                      requestBulkOperation({ kind: "stock", value: bulkStock })
                    }
                  >
                    <Boxes aria-hidden="true" />
                    Set stock
                  </button>
                  <label>
                    <span>Vendor</span>
                    <select
                      value={bulkVendor}
                      onChange={(event) => setBulkVendor(event.currentTarget.value)}
                    >
                      {VENDORS.map((vendorName) => (
                        <option value={vendorName} key={vendorName}>
                          {vendorName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    onClick={() =>
                      requestBulkOperation({ kind: "vendor", value: bulkVendor })
                    }
                  >
                    <Building2 aria-hidden="true" />
                    Change vendor
                  </button>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="danger-ghost"
                    onClick={() => requestBulkOperation({ kind: "delete" })}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete selected
                  </button>
                </div>
                {bulkError ? (
                  <p id="gbpr-split-bulk-error" role="alert">
                    {bulkError}
                  </p>
                ) : null}
              </section>
            ) : null}

            <div className="gbpr-split-layout">
              <section
                className="gbpr-split-catalogue"
                aria-labelledby="gbpr-split-catalogue-title"
              >
                <header className="gbpr-split-catalogue-header">
                  <div>
                    <span className="gbpr-eyebrow">Catalogue</span>
                    <h3 id="gbpr-split-catalogue-title">Product list</h3>
                  </div>
                  <label className="gbpr-split-select-all">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                    <span>Select all visible</span>
                  </label>
                </header>

                {products.length === 0 ? (
                  <div className="gbpr-split-empty" role="status">
                    <PackageOpen aria-hidden="true" />
                    <h3>No products in this catalogue</h3>
                    <p>Add a product or import a price list to continue.</p>
                    <button
                      type="button"
                      className="gbpr-button"
                      data-variant="primary"
                      onClick={() => setAddMode(true)}
                    >
                      <Plus aria-hidden="true" />
                      Add Product
                    </button>
                  </div>
                ) : listedProducts.length === 0 ? (
                  <div className="gbpr-split-empty" role="status">
                    <Search aria-hidden="true" />
                    <h3>No products match these filters</h3>
                    <p>
                      {activeFilterSummary ? `${activeFilterSummary}. ` : ""}
                      Clear filters to return to the full catalogue.
                    </p>
                    <button
                      type="button"
                      className="gbpr-button"
                      data-variant="primary"
                      onClick={clearFilters}
                    >
                      <FilterX aria-hidden="true" />
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="gbpr-split-list-scroll">
                    <ul ref={catalogueRef} className="gbpr-split-list">
                      {listedProducts.map((product, rowIndex) => {
                        const status = getProductStatus(product);
                        const editorSelected = product.id === selectedId;
                        const pinnedOutsideFilters =
                          selectedProductPinned && editorSelected;
                        return (
                          <li
                            className="gbpr-split-row"
                            data-current={editorSelected ? "true" : undefined}
                            key={product.id}
                          >
                            <label className="gbpr-split-row-select">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(product.id)}
                                onChange={() => toggleProduct(product.id)}
                                aria-label={`Select product ${product.name}`}
                              />
                            </label>
                            <button
                              type="button"
                              className="gbpr-split-row-button"
                              aria-current={editorSelected ? "true" : undefined}
                              data-split-row-index={rowIndex}
                              onClick={() => requestProductSwitch(product.id)}
                              onKeyDown={(event) => handleRowKeyDown(event, rowIndex)}
                            >
                              <span className="gbpr-split-row-main">
                                <strong>{product.name}</strong>
                                <small>
                                  {product.vendor} / {product.category} / {product.mgSize}
                                </small>
                              </span>
                              <span className="gbpr-split-row-metrics">
                                <strong>{MONEY.format(product.price)}</strong>
                                <small>{stockLabel(product)}</small>
                              </span>
                              <span
                                className="gbpr-split-status"
                                data-status={
                                  pinnedOutsideFilters ? "low-stock" : status
                                }
                              >
                                {pinnedOutsideFilters
                                  ? `Unsaved draft pinned outside current filters / ${STATUS_LABELS[status]}`
                                  : STATUS_LABELS[status]}
                              </span>
                              <ChevronRight aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>

              <aside className="gbpr-inspector-panel" aria-label="Product inspector">
                {selectedProduct && draft ? (
                  <form
                    ref={inspectorFormRef}
                    className="gbpr-inspector-form"
                    noValidate
                    onSubmit={saveDraft}
                  >
                    <header className="gbpr-inspector-header">
                      <div>
                        <span className="gbpr-eyebrow">Product inspector</span>
                        <h3>{selectedProduct.name}</h3>
                        <p>{selectedProduct.id}</p>
                      </div>
                      {dirty ? (
                        <span className="gbpr-inspector-dirty" role="status">
                          <CircleAlert aria-hidden="true" />
                          Unsaved changes
                        </span>
                      ) : (
                        <span className="gbpr-inspector-saved">
                          <CheckCircle2 aria-hidden="true" />
                          Saved
                        </span>
                      )}
                    </header>

                    <div className="gbpr-inspector-fields">
                      <div className="gbpr-inspector-field gbpr-inspector-field-wide">
                        <label htmlFor={`${inspectorId}-name`}>Name</label>
                        <input
                          id={`${inspectorId}-name`}
                          value={draft.name}
                          onChange={(event) => {
                            updateDraft("name", event.currentTarget.value);
                            clearDraftError("name");
                          }}
                          aria-invalid={errors.name ? "true" : undefined}
                          aria-describedby={
                            errors.name ? `${inspectorId}-name-error` : undefined
                          }
                          autoComplete="off"
                        />
                        {errors.name ? (
                          <span
                            className="gbpr-inspector-error"
                            id={`${inspectorId}-name-error`}
                            role="alert"
                          >
                            {errors.name}
                          </span>
                        ) : null}
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-price`}>Price</label>
                        <div className="gbpr-inspector-price-input">
                          <span aria-hidden="true">£</span>
                          <input
                            id={`${inspectorId}-price`}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={draft.price}
                            onChange={(event) => {
                              updateDraft("price", event.currentTarget.value);
                              clearDraftError("price");
                            }}
                            aria-invalid={errors.price ? "true" : undefined}
                            aria-describedby={
                              errors.price
                                ? `${inspectorId}-price-error`
                                : undefined
                            }
                          />
                        </div>
                        {errors.price ? (
                          <span
                            className="gbpr-inspector-error"
                            id={`${inspectorId}-price-error`}
                            role="alert"
                          >
                            {errors.price}
                          </span>
                        ) : null}
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-vendor`}>Vendor</label>
                        <select
                          id={`${inspectorId}-vendor`}
                          value={draft.vendor}
                          onChange={(event) => {
                            updateDraft("vendor", event.currentTarget.value);
                            clearDraftError("vendor");
                          }}
                          aria-invalid={errors.vendor ? "true" : undefined}
                          aria-describedby={
                            errors.vendor
                              ? `${inspectorId}-vendor-error`
                              : undefined
                          }
                        >
                          <option value="">Choose vendor</option>
                          {VENDORS.map((vendorName) => (
                            <option value={vendorName} key={vendorName}>
                              {vendorName}
                            </option>
                          ))}
                        </select>
                        {errors.vendor ? (
                          <span
                            className="gbpr-inspector-error"
                            id={`${inspectorId}-vendor-error`}
                            role="alert"
                          >
                            {errors.vendor}
                          </span>
                        ) : null}
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-category`}>Category</label>
                        <select
                          id={`${inspectorId}-category`}
                          value={draft.category}
                          onChange={(event) =>
                            updateDraft("category", event.currentTarget.value)
                          }
                        >
                          {CATEGORIES.map((categoryName) => (
                            <option value={categoryName} key={categoryName}>
                              {categoryName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-size`}>Size / mg</label>
                        <input
                          id={`${inspectorId}-size`}
                          value={draft.mgSize}
                          onChange={(event) =>
                            updateDraft("mgSize", event.currentTarget.value)
                          }
                          placeholder="e.g. 10 mg"
                          autoComplete="off"
                        />
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-stock`}>Stock</label>
                        <input
                          id={`${inspectorId}-stock`}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={draft.stock}
                          onChange={(event) => {
                            updateDraft("stock", event.currentTarget.value);
                            clearDraftError("stock");
                          }}
                          placeholder="Unlimited"
                          aria-invalid={errors.stock ? "true" : undefined}
                          aria-describedby={
                            errors.stock
                              ? `${inspectorId}-stock-error`
                              : `${inspectorId}-stock-hint`
                          }
                        />
                        <span
                          className="gbpr-inspector-hint"
                          id={`${inspectorId}-stock-hint`}
                        >
                          Leave blank for unlimited.
                        </span>
                        {errors.stock ? (
                          <span
                            className="gbpr-inspector-error"
                            id={`${inspectorId}-stock-error`}
                            role="alert"
                          >
                            {errors.stock}
                          </span>
                        ) : null}
                      </div>

                      <div className="gbpr-inspector-field">
                        <label htmlFor={`${inspectorId}-maximum`}>
                          Max per customer
                        </label>
                        <input
                          id={`${inspectorId}-maximum`}
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draft.maxPerCustomer}
                          onChange={(event) => {
                            updateDraft(
                              "maxPerCustomer",
                              event.currentTarget.value,
                            );
                            clearDraftError("maxPerCustomer");
                          }}
                          placeholder="No limit"
                          aria-invalid={
                            errors.maxPerCustomer ? "true" : undefined
                          }
                          aria-describedby={
                            errors.maxPerCustomer
                              ? `${inspectorId}-maximum-error`
                              : `${inspectorId}-maximum-hint`
                          }
                        />
                        <span
                          className="gbpr-inspector-hint"
                          id={`${inspectorId}-maximum-hint`}
                        >
                          Leave blank for no limit.
                        </span>
                        {errors.maxPerCustomer ? (
                          <span
                            className="gbpr-inspector-error"
                            id={`${inspectorId}-maximum-error`}
                            role="alert"
                          >
                            {errors.maxPerCustomer}
                          </span>
                        ) : null}
                      </div>

                      <fieldset className="gbpr-inspector-toggles gbpr-inspector-field-wide">
                        <legend>Availability</legend>
                        <label>
                          <span>
                            <strong>Visible</strong>
                            <small>Show this product to group buy members.</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={draft.visible}
                            onChange={(event) =>
                              updateDraft("visible", event.currentTarget.checked)
                            }
                          />
                        </label>
                        <label>
                          <span>
                            <strong>Half kits</strong>
                            <small>Allow half-kit reservations for this item.</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={draft.halfKitEnabled}
                            onChange={(event) =>
                              updateDraft(
                                "halfKitEnabled",
                                event.currentTarget.checked,
                              )
                            }
                          />
                        </label>
                      </fieldset>
                    </div>

                    <footer className="gbpr-inspector-footer">
                      <button
                        type="button"
                        className="gbpr-button"
                        data-variant="danger-ghost"
                        onClick={() =>
                          setConfirmationState({
                            kind: "delete-product",
                            productId: selectedProduct.id,
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </button>
                      <button
                        type="submit"
                        className="gbpr-button"
                        data-variant="primary"
                        data-testid="save-product"
                        disabled={!dirty}
                      >
                        <Save aria-hidden="true" />
                        Save changes
                      </button>
                    </footer>
                  </form>
                ) : (
                  <div className="gbpr-inspector-empty" role="status">
                    <PackageOpen aria-hidden="true" />
                    <span className="gbpr-eyebrow">Product inspector</span>
                    <h3>No product selected</h3>
                    <p>
                      Choose a product from the current catalogue view to inspect it.
                    </p>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        className="gbpr-button"
                        data-variant="secondary"
                        onClick={clearFilters}
                      >
                        <FilterX aria-hidden="true" />
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      <ConfirmAction
        open={confirmationState !== null}
        title={confirmationDetails.title}
        description={confirmationDetails.description}
        confirmLabel={confirmationDetails.confirmLabel}
        tone={confirmationDetails.tone}
        onConfirm={confirmCurrentAction}
        onCancel={cancelConfirmation}
      />

      {feedback ? (
        <MockFeedback
          message={feedback.message}
          onUndo={undoLastChange}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </ProductShell>
  );
}
