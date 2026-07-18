import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  Columns3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  MoreHorizontal,
  PackageOpen,
  Plus,
  PoundSterling,
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
import "./_group.css";

type SortKey =
  | "name"
  | "vendor"
  | "mgSize"
  | "category"
  | "price"
  | "stock"
  | "maxPerCustomer"
  | "status"
  | "lastEdited";

type SortDirection = "ascending" | "descending";
type ColumnKey = Exclude<SortKey, "name">;
type InlineField = "price" | "stock" | "limit";
type InlineValues = Record<string, Partial<Record<InlineField, string>>>;
type InlineErrors = Record<string, Partial<Record<InlineField, string>>>;
type ImportMode = "csv" | "ai";

type FormState =
  | { mode: "add" }
  | { mode: "edit"; productId: string }
  | null;

type PendingBulkOperation =
  | { kind: "price"; value: string }
  | { kind: "stock"; value: string }
  | { kind: "vendor"; value: string }
  | { kind: "visibility"; visible: boolean }
  | { kind: "delete" }
  | { kind: "more" };

type ConfirmationState =
  | { kind: "import"; mode: ImportMode; count: number }
  | { kind: "bulk"; operation: Exclude<PendingBulkOperation, { kind: "more" }> }
  | { kind: "delete-product"; productId: string }
  | null;

type FeedbackState = {
  message: string;
  products: ProductRecord[];
  selectedIds: string[];
};

type DisplayStatus = "live" | "paused" | "low" | "out" | "unlimited";

const COLUMN_OPTIONS: readonly { key: ColumnKey; label: string }[] = [
  { key: "vendor", label: "Vendor" },
  { key: "mgSize", label: "Size" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock" },
  { key: "maxPerCustomer", label: "Limit" },
  { key: "status", label: "Status" },
  { key: "lastEdited", label: "Last edited" },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  vendor: true,
  mgSize: true,
  category: true,
  price: true,
  stock: true,
  maxPerCustomer: true,
  status: true,
  lastEdited: false,
};

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const STYLES: Record<string, CSSProperties> = {
  workspace: {
    display: "grid",
    gap: 14,
    minWidth: 0,
  },
  pageHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  pageHeading: {
    margin: 0,
    color: "var(--gbpr-ink)",
    fontSize: 28,
    fontWeight: 780,
    lineHeight: 1.15,
  },
  pageCopy: {
    maxWidth: 620,
    margin: "6px 0 0",
    color: "var(--gbpr-muted)",
    fontSize: 12,
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  resultCount: {
    color: "var(--gbpr-muted)",
    fontSize: 11,
    fontWeight: 680,
    whiteSpace: "nowrap",
  },
  columnControl: {
    position: "relative",
  },
  columnMenu: {
    position: "absolute",
    zIndex: 40,
    top: "calc(100% + 6px)",
    right: 0,
    display: "grid",
    width: 210,
    gap: 2,
    margin: 0,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    padding: 8,
    background: "var(--gbpr-panel)",
    boxShadow: "var(--gbpr-shadow-float)",
  },
  columnOption: {
    display: "flex",
    minHeight: 40,
    alignItems: "center",
    gap: 9,
    borderRadius: 7,
    padding: "7px 8px",
    color: "var(--gbpr-ink)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 650,
  },
  checkbox: {
    width: 18,
    height: 18,
    margin: 0,
    accentColor: "var(--gbpr-blue)",
  },
  bulkToolbar: {
    position: "sticky",
    zIndex: 20,
    top: 76,
    flexWrap: "wrap",
    borderColor: "rgba(45, 107, 204, 0.42)",
    background: "#F5F8FE",
    boxShadow: "0 8px 24px rgba(27, 58, 122, 0.12)",
  },
  bulkLead: {
    display: "flex",
    minWidth: 160,
    alignItems: "center",
    gap: 9,
    color: "var(--gbpr-navy)",
    fontSize: 12,
    fontWeight: 780,
  },
  bulkEditor: {
    display: "flex",
    flex: "1 1 100%",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    borderTop: "1px solid rgba(45, 107, 204, 0.16)",
    paddingTop: 9,
  },
  compactInput: {
    width: 180,
    minHeight: 44,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    padding: "8px 11px",
    background: "#FFFFFF",
  },
  panel: {
    minWidth: 0,
    overflow: "hidden",
  },
  tableWrap: {
    maxHeight: "calc(100dvh - 334px)",
    minHeight: 320,
    overflow: "auto",
  },
  table: {
    minWidth: 1110,
  },
  tableHeader: {
    position: "sticky",
    zIndex: 5,
    top: 0,
  },
  sortButton: {
    display: "inline-flex",
    minHeight: 32,
    alignItems: "center",
    gap: 5,
    border: 0,
    padding: 0,
    color: "inherit",
    background: "transparent",
    font: "inherit",
    fontWeight: "inherit",
    textTransform: "inherit",
  },
  sortIcon: {
    width: 13,
    height: 13,
  },
  productCell: {
    display: "grid",
    minWidth: 210,
    gap: 2,
  },
  productName: {
    color: "var(--gbpr-ink)",
    fontSize: 12,
    fontWeight: 740,
  },
  productDescription: {
    maxWidth: 250,
    overflow: "hidden",
    color: "var(--gbpr-muted)",
    fontSize: 10,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cellInput: {
    minWidth: 82,
    maxWidth: 104,
  },
  status: {
    display: "inline-flex",
    minHeight: 26,
    alignItems: "center",
    border: "1px solid transparent",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 9,
    fontWeight: 780,
    whiteSpace: "nowrap",
  },
  rowActions: {
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
  },
  rowMenu: {
    position: "absolute",
    zIndex: 12,
    top: "calc(100% + 4px)",
    right: 0,
    display: "grid",
    width: 170,
    gap: 3,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    padding: 6,
    background: "#FFFFFF",
    boxShadow: "var(--gbpr-shadow-float)",
  },
  emptyActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  error: {
    color: "var(--gbpr-danger)",
    fontSize: 10,
    fontWeight: 650,
  },
};

function cloneProducts(products: readonly ProductRecord[]): ProductRecord[] {
  return products.map((product) => ({ ...product }));
}

function getDisplayStatus(product: ProductRecord): DisplayStatus {
  const status = getProductStatus(product);
  if (status === "paused") return "paused";
  if (status === "low-stock") return "low";
  if (status === "out-of-stock") return "out";
  return product.stock === null ? "unlimited" : "live";
}

const STATUS_PRESENTATION: Record<
  DisplayStatus,
  { label: string; tone: "success" | "neutral" | "warning" | "info"; style?: CSSProperties }
> = {
  live: { label: "Live", tone: "success" },
  paused: { label: "Paused", tone: "neutral" },
  low: { label: "Low stock", tone: "warning" },
  out: {
    label: "Out of stock",
    tone: "neutral",
    style: {
      borderColor: "rgba(180, 35, 24, 0.2)",
      color: "var(--gbpr-danger)",
      background: "#FFF0EE",
    },
  },
  unlimited: { label: "Unlimited", tone: "info" },
};

function ProductStatusBadge({ product }: { product: ProductRecord }) {
  const status = getDisplayStatus(product);
  const presentation = STATUS_PRESENTATION[status];
  return (
    <span
      className="gbpr-status"
      data-status={status}
      data-tone={presentation.tone}
      style={presentation.style}
    >
      {presentation.label}
    </span>
  );
}

function sortValue(product: ProductRecord, key: SortKey): string | number {
  switch (key) {
    case "stock":
      return product.stock ?? Number.MAX_SAFE_INTEGER;
    case "maxPerCustomer":
      return product.maxPerCustomer ?? Number.MAX_SAFE_INTEGER;
    case "status":
      return getDisplayStatus(product);
    default:
      return product[key];
  }
}

function compareProducts(left: ProductRecord, right: ProductRecord, key: SortKey) {
  const leftValue = sortValue(left, key);
  const rightValue = sortValue(right, key);
  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }
  return String(leftValue).localeCompare(String(rightValue), "en-GB", {
    numeric: true,
    sensitivity: "base",
  });
}

function candidateFromProduct(product: ProductRecord): ImportCandidate {
  return {
    name: product.name,
    vendor: product.vendor,
    mgSize: product.mgSize,
    price: product.price,
  };
}

function productIdentity(product: Pick<ProductRecord, "name" | "vendor" | "mgSize">) {
  return [product.name, product.vendor, product.mgSize]
    .map((value) => value.trim().toLowerCase())
    .join("\u001f");
}

function createNewImportCandidate(
  mode: ImportMode,
  existing: readonly ProductRecord[],
): ImportCandidate {
  const baseName = mode === "csv" ? "Mazdutide Preview" : "Cagrilintide Preview";
  let suffix = 0;
  let candidate: ImportCandidate;

  do {
    suffix += 1;
    candidate = {
      name: suffix === 1 ? baseName : `${baseName} ${suffix}`,
      vendor: "QSC",
      mgSize: "10 mg",
      price: mode === "csv" ? 54 : 57.5,
    };
  } while (existing.some((product) => productIdentity(product) === productIdentity(candidate)));

  return candidate;
}

export default function CommandGrid() {
  const [products, setProducts] = useState<ProductRecord[]>(() =>
    cloneProducts(SAMPLE_PRODUCTS),
  );
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("all");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<ProductFilters["stock"]>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [visibleColumns, setVisibleColumns] = useState(() => ({
    ...DEFAULT_VISIBLE_COLUMNS,
  }));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [importRows, setImportRows] = useState<ImportReviewRow[]>([]);
  const [pendingBulkOperation, setPendingBulkOperation] =
    useState<PendingBulkOperation | null>(null);
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>(null);
  const [bulkError, setBulkError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [inlineValues, setInlineValues] = useState<InlineValues>({});
  const [inlineErrors, setInlineErrors] = useState<InlineErrors>({});
  const [openRowActionsId, setOpenRowActionsId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const productSequenceRef = useRef(1);

  const filteredProducts = useMemo(() => {
    const filtered = filterProducts(products, {
      query,
      vendor,
      category,
      stock,
    });
    return filtered.sort((left, right) => {
      const comparison = compareProducts(left, right, sortKey);
      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [category, products, query, sortDirection, sortKey, stock, vendor]);

  const visibleProductIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );
  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleProductIds.every((productId) => selectedIds.has(productId));
  const someVisibleSelected = visibleProductIds.some((productId) =>
    selectedIds.has(productId),
  );
  const hasActiveFilters =
    query.trim().length > 0 ||
    vendor !== "all" ||
    category !== "all" ||
    stock !== "all";

  const formProduct =
    formState?.mode === "edit"
      ? products.find((product) => product.id === formState.productId) ?? null
      : null;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  function commitProducts(
    nextProducts: ProductRecord[],
    message: string,
    clearSelection = false,
  ) {
    setFeedback({
      message,
      products: cloneProducts(products),
      selectedIds: [...selectedIds],
    });
    setProducts(cloneProducts(nextProducts));
    if (clearSelection) setSelectedIds(new Set());
  }

  function clearFilters() {
    setQuery("");
    setVendor("all");
    setCategory("all");
    setStock("all");
  }

  function resetPreview() {
    const previousProducts = cloneProducts(products);
    const previousSelection = [...selectedIds];
    setProducts(resetProducts(products));
    clearFilters();
    setSortKey("name");
    setSortDirection("ascending");
    setSelectedIds(new Set());
    setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
    setColumnsOpen(false);
    setFormState(null);
    setImportMode(null);
    setImportRows([]);
    setPendingBulkOperation(null);
    setConfirmationState(null);
    setInlineValues({});
    setInlineErrors({});
    setOpenRowActionsId(null);
    setFeedback({
      message: "Preview reset to the 120 sample products.",
      products: previousProducts,
      selectedIds: previousSelection,
    });
  }

  function undoLastChange() {
    if (!feedback) return;
    setProducts(cloneProducts(feedback.products));
    setSelectedIds(new Set(feedback.selectedIds));
    setInlineValues({});
    setInlineErrors({});
    setFeedback(null);
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleProductIds.forEach((productId) => next.delete(productId));
      } else {
        visibleProductIds.forEach((productId) => next.add(productId));
      }
      return next;
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

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : "ascending",
      );
      return;
    }
    setSortKey(nextKey);
    setSortDirection("ascending");
  }

  function setInlineValue(
    productId: string,
    field: InlineField,
    value: string,
  ) {
    setInlineValues((current) => ({
      ...current,
      [productId]: { ...current[productId], [field]: value },
    }));
    setInlineErrors((current) => ({
      ...current,
      [productId]: { ...current[productId], [field]: undefined },
    }));
  }

  function clearInlineCell(productId: string, field: InlineField) {
    setInlineValues((current) => ({
      ...current,
      [productId]: { ...current[productId], [field]: undefined },
    }));
    setInlineErrors((current) => ({
      ...current,
      [productId]: { ...current[productId], [field]: undefined },
    }));
  }

  function saveInlineEdit(product: ProductRecord, field: InlineField) {
    const value = inlineValues[product.id]?.[field];
    if (value === undefined) return;

    let patch: Partial<Omit<ProductRecord, "id">> = {};
    let error = "";
    if (field === "price") {
      const price = Number(value);
      if (!value.trim() || !Number.isFinite(price) || price < 0) {
        error = "Enter a price of zero or more.";
      } else {
        patch = { price };
      }
    } else if (field === "stock") {
      const stockValue = Number(value);
      if (value.trim() && (!Number.isInteger(stockValue) || stockValue < 0)) {
        error = "Use a whole number or leave blank.";
      } else {
        patch = { stock: value.trim() ? stockValue : null };
      }
    } else {
      const limit = Number(value);
      if (value.trim() && (!Number.isInteger(limit) || limit < 1)) {
        error = "Use a whole number of one or more.";
      } else {
        patch = { maxPerCustomer: value.trim() ? limit : null };
      }
    }

    if (error) {
      setInlineErrors((current) => ({
        ...current,
        [product.id]: { ...current[product.id], [field]: error },
      }));
      return;
    }

    const nextProducts = products.map((current) =>
      current.id === product.id
        ? { ...current, ...patch, lastEdited: new Date().toISOString() }
        : { ...current },
    );
    commitProducts(nextProducts, `${product.name} updated.`);
    clearInlineCell(product.id, field);
  }

  function handleInlineKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    product: ProductRecord,
    field: InlineField,
  ) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.preventDefault();
      clearInlineCell(product.id, field);
    }
  }

  function handleProductSave(patch: Partial<Omit<ProductRecord, "id">>) {
    if (formState?.mode === "edit") {
      const target = products.find((product) => product.id === formState.productId);
      if (!target) {
        setFormState(null);
        return;
      }
      const nextProducts = products.map((product) =>
        product.id === target.id
          ? { ...product, ...patch, lastEdited: new Date().toISOString() }
          : { ...product },
      );
      commitProducts(nextProducts, `${target.name} saved.`);
      setFormState(null);
      return;
    }

    const nextProduct: ProductRecord = {
      id: `command-product-${String(productSequenceRef.current++).padStart(3, "0")}`,
      name: patch.name ?? "Untitled product",
      description: patch.description ?? "Added in the Command Grid preview.",
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
    commitProducts([...products, nextProduct], `${nextProduct.name} added.`);
    setFormState(null);
  }

  function openImport(mode: ImportMode) {
    const existing = products.length ? products : SAMPLE_PRODUCTS;
    const duplicate = existing[0];
    const changed = existing[1] ?? existing[0];
    const incoming: ImportCandidate[] = [
      candidateFromProduct(duplicate),
      { ...candidateFromProduct(changed), price: changed.price + 7.5 },
      createNewImportCandidate(mode, existing),
    ];
    setImportRows(classifyImportRows(existing, incoming));
    setImportMode(mode);
    setFormState(null);
  }

  function confirmImport() {
    const includedRows = importRows.filter((row) => row.included);
    let nextProducts = cloneProducts(products);

    for (const row of includedRows) {
      const identity = productIdentity(row);
      const existingIndex = nextProducts.findIndex(
        (product) => productIdentity(product) === identity,
      );
      if (existingIndex >= 0) {
        nextProducts[existingIndex] = {
          ...nextProducts[existingIndex],
          name: row.name,
          vendor: row.vendor,
          mgSize: row.mgSize,
          price: row.price,
          lastEdited: new Date().toISOString(),
        };
      } else {
        nextProducts.push({
          id: `command-import-${String(productSequenceRef.current++).padStart(3, "0")}`,
          name: row.name,
          description: "Imported into the Command Grid preview.",
          vendor: row.vendor,
          category: "Other",
          mgSize: row.mgSize,
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
    );
    setImportMode(null);
    setImportRows([]);
  }

  function requestImportConfirmation() {
    const includedCount = importRows.filter((row) => row.included).length;
    if (!importMode || includedCount === 0) return;
    setConfirmationState({ kind: "import", mode: importMode, count: includedCount });
  }

  function chooseBulkOperation(operation: PendingBulkOperation) {
    setPendingBulkOperation(operation);
    setBulkError("");
  }

  function reviewBulkOperation() {
    if (!pendingBulkOperation || pendingBulkOperation.kind === "more") return;
    if (pendingBulkOperation.kind === "price") {
      const price = Number(pendingBulkOperation.value);
      if (
        !pendingBulkOperation.value.trim() ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        setBulkError("Enter a finite price of zero or more.");
        return;
      }
    }
    if (pendingBulkOperation.kind === "stock") {
      const stockValue = Number(pendingBulkOperation.value);
      if (
        pendingBulkOperation.value.trim() &&
        (!Number.isInteger(stockValue) || stockValue < 0)
      ) {
        setBulkError("Use a whole stock number or leave blank for unlimited.");
        return;
      }
    }
    setBulkError("");
    setConfirmationState({ kind: "bulk", operation: pendingBulkOperation });
  }

  function queueDirectBulkOperation(
    operation: Extract<PendingBulkOperation, { kind: "visibility" } | { kind: "delete" }>,
  ) {
    setPendingBulkOperation(operation);
    setConfirmationState({ kind: "bulk", operation });
  }

  function confirmCurrentAction() {
    if (!confirmationState) return;
    if (confirmationState.kind === "import") {
      confirmImport();
      setConfirmationState(null);
      return;
    }
    if (confirmationState.kind === "delete-product") {
      const target = products.find(
        (product) => product.id === confirmationState.productId,
      );
      if (target) {
        commitProducts(
          products.filter((product) => product.id !== target.id),
          `${target.name} deleted.`,
          true,
        );
      }
      setConfirmationState(null);
      return;
    }

    const operation = confirmationState.operation;
    let nextProducts: ProductRecord[];
    let message: string;
    if (operation.kind === "delete") {
      nextProducts = products.filter((product) => !selectedIds.has(product.id));
      message = `${selectedIds.size} selected products deleted.`;
    } else {
      const patch: Partial<Omit<ProductRecord, "id">> =
        operation.kind === "price"
          ? { price: Number(operation.value) }
          : operation.kind === "stock"
            ? {
                stock: operation.value.trim()
                  ? Number(operation.value)
                  : null,
              }
            : operation.kind === "vendor"
              ? { vendor: operation.value }
              : { visible: operation.visible };
      nextProducts = applyBulkPatch(products, selectedIds, {
        ...patch,
        lastEdited: new Date().toISOString(),
      });
      message = `${selectedIds.size} selected products updated.`;
    }
    commitProducts(nextProducts, message, true);
    setConfirmationState(null);
    setPendingBulkOperation(null);
  }

  const confirmationDetails = (() => {
    if (confirmationState?.kind === "import") {
      const source = confirmationState.mode === "csv" ? "CSV" : "AI Price List";
      return {
        title: "Confirm import?",
        description: `Import ${confirmationState.count} products from ${source} into ${GROUP_BUY_NAME}?`,
        confirmLabel: "Apply import",
        tone: "primary" as const,
      };
    }
    if (confirmationState?.kind === "delete-product") {
      const product = products.find(
        (item) => item.id === confirmationState.productId,
      );
      return {
        title: "Delete product?",
        description: `Delete ${product?.name ?? "this product"} from the preview catalogue? You can undo this change afterward.`,
        confirmLabel: "Delete product",
        tone: "danger" as const,
      };
    }
    if (confirmationState?.kind === "bulk") {
      const deleting = confirmationState.operation.kind === "delete";
      return {
        title: deleting ? "Delete selected products?" : "Apply bulk change?",
        description: `${deleting ? "Delete" : "Update"} ${selectedIds.size} selected products in ${GROUP_BUY_NAME}?`,
        confirmLabel: deleting ? "Delete products" : "Apply changes",
        tone: deleting ? ("danger" as const) : ("primary" as const),
      };
    }
    return {
      title: "Confirm action",
      description: "Review this catalogue change before continuing.",
      confirmLabel: "Confirm",
      tone: "primary" as const,
    };
  })();

  function renderSortableHeader(label: string, key: SortKey) {
    const SortIcon =
      sortKey !== key
        ? ArrowUpDown
        : sortDirection === "ascending"
          ? ArrowUp
          : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={sortKey === key ? sortDirection : "none"}
        style={STYLES.tableHeader}
      >
        <button
          type="button"
          style={STYLES.sortButton}
          onClick={() => changeSort(key)}
          aria-label={`Sort by ${label}`}
        >
          {label}
          <SortIcon aria-hidden="true" style={STYLES.sortIcon} />
        </button>
      </th>
    );
  }

  function renderBulkEditor() {
    if (!pendingBulkOperation) return null;
    if (pendingBulkOperation.kind === "price") {
      return (
        <div style={STYLES.bulkEditor}>
          <label className="gbpr-visually-hidden" htmlFor="command-bulk-price">
            New price for selected products
          </label>
          <input
            id="command-bulk-price"
            style={STYLES.compactInput}
            inputMode="decimal"
            value={pendingBulkOperation.value}
            onChange={(event) =>
              chooseBulkOperation({ kind: "price", value: event.currentTarget.value })
            }
            placeholder="New price"
            aria-invalid={bulkError ? "true" : undefined}
            aria-describedby={bulkError ? "command-bulk-error" : undefined}
          />
          <button
            type="button"
            className="gbpr-button"
            data-variant="primary"
            onClick={reviewBulkOperation}
          >
            <Check aria-hidden="true" />
            Review price change
          </button>
          {bulkError ? (
            <span id="command-bulk-error" role="alert" style={STYLES.error}>
              {bulkError}
            </span>
          ) : null}
        </div>
      );
    }
    if (pendingBulkOperation.kind === "stock") {
      return (
        <div style={STYLES.bulkEditor}>
          <label className="gbpr-visually-hidden" htmlFor="command-bulk-stock">
            New stock for selected products
          </label>
          <input
            id="command-bulk-stock"
            style={STYLES.compactInput}
            inputMode="numeric"
            value={pendingBulkOperation.value}
            onChange={(event) =>
              chooseBulkOperation({ kind: "stock", value: event.currentTarget.value })
            }
            placeholder="Blank means unlimited"
            aria-invalid={bulkError ? "true" : undefined}
            aria-describedby={bulkError ? "command-bulk-error" : undefined}
          />
          <button
            type="button"
            className="gbpr-button"
            data-variant="primary"
            onClick={reviewBulkOperation}
          >
            <Check aria-hidden="true" />
            Review stock change
          </button>
          {bulkError ? (
            <span id="command-bulk-error" role="alert" style={STYLES.error}>
              {bulkError}
            </span>
          ) : null}
        </div>
      );
    }
    if (pendingBulkOperation.kind === "vendor") {
      return (
        <div style={STYLES.bulkEditor}>
          <label className="gbpr-visually-hidden" htmlFor="command-bulk-vendor">
            New vendor for selected products
          </label>
          <select
            id="command-bulk-vendor"
            style={STYLES.compactInput}
            value={pendingBulkOperation.value}
            onChange={(event) =>
              chooseBulkOperation({ kind: "vendor", value: event.currentTarget.value })
            }
          >
            {VENDORS.map((vendorName) => (
              <option value={vendorName} key={vendorName}>
                {vendorName}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="gbpr-button"
            data-variant="primary"
            onClick={reviewBulkOperation}
          >
            <Check aria-hidden="true" />
            Review vendor change
          </button>
        </div>
      );
    }
    if (pendingBulkOperation.kind === "more") {
      return (
        <div style={STYLES.bulkEditor} aria-label="More bulk actions">
          <button
            type="button"
            className="gbpr-button"
            data-variant="secondary"
            onClick={() => queueDirectBulkOperation({ kind: "visibility", visible: false })}
          >
            <EyeOff aria-hidden="true" />
            Pause products
          </button>
          <button
            type="button"
            className="gbpr-button"
            data-variant="secondary"
            onClick={() => queueDirectBulkOperation({ kind: "visibility", visible: true })}
          >
            <Eye aria-hidden="true" />
            Make products live
          </button>
          <button
            type="button"
            className="gbpr-button"
            data-variant="danger-ghost"
            onClick={() => queueDirectBulkOperation({ kind: "delete" })}
          >
            <Trash2 aria-hidden="true" />
            Delete products
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <ProductShell concept="Command Grid" pageTitle="Products" onReset={resetPreview}>
      <div style={STYLES.workspace}>
        <header style={STYLES.pageHeader}>
          <div>
            <span className="gbpr-eyebrow">Catalogue command centre</span>
            <h2 style={STYLES.pageHeading}>Products</h2>
            <p style={STYLES.pageCopy}>
              Manage {SAMPLE_PRODUCTS.length} products for {GROUP_BUY_NAME}. {filteredProducts.length} currently in view.
            </p>
          </div>
          <div style={STYLES.headerActions}>
            <button
              type="button"
              className="gbpr-button"
              data-variant="primary"
              onClick={() => {
                setFormState({ mode: "add" });
                setImportMode(null);
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

        {formState ? (
          <ProductForm
            product={formProduct}
            onSave={handleProductSave}
            onCancel={() => setFormState(null)}
          />
        ) : importMode ? (
          <ImportReview
            rows={importRows}
            mode={importMode}
            onToggle={(rowId) =>
              setImportRows((current) =>
                current.map((row) =>
                  row.id === rowId ? { ...row, included: !row.included } : row,
                ),
              )
            }
            onEdit={(rowId, patch) =>
              setImportRows((current) =>
                current.map((row) =>
                  row.id === rowId ? { ...row, ...patch } : row,
                ),
              )
            }
            onConfirm={requestImportConfirmation}
            onCancel={() => {
              setImportMode(null);
              setImportRows([]);
            }}
          />
        ) : (
          <>
            <section className="gbpr-toolbar" aria-label="Product filters">
              <div className="gbpr-toolbar-group" style={{ flex: "1 1 640px" }}>
                <label className="gbpr-toolbar-search">
                  <span className="gbpr-visually-hidden">Search products</span>
                  <Search aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search name, vendor, category"
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span className="gbpr-visually-hidden">Filter by vendor</span>
                  <select
                    aria-label="Filter by vendor"
                    value={vendor}
                    onChange={(event) => setVendor(event.currentTarget.value)}
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
                    onChange={(event) => setCategory(event.currentTarget.value)}
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
                      setStock(event.currentTarget.value as ProductFilters["stock"])
                    }
                  >
                    <option value="all">All stock</option>
                    <option value="available">Available</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </label>
              </div>
              <div className="gbpr-toolbar-actions">
                <span style={STYLES.resultCount} aria-live="polite">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "result" : "results"}
                </span>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="ghost"
                    onClick={clearFilters}
                  >
                    <X aria-hidden="true" />
                    Clear filters
                  </button>
                ) : null}
                <div style={STYLES.columnControl}>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    aria-expanded={columnsOpen}
                    aria-controls="command-grid-columns"
                    onClick={() => setColumnsOpen((current) => !current)}
                  >
                    <Columns3 aria-hidden="true" />
                    Columns
                    <ChevronDown aria-hidden="true" />
                  </button>
                  {columnsOpen ? (
                    <fieldset id="command-grid-columns" style={STYLES.columnMenu}>
                      <legend className="gbpr-visually-hidden">Visible columns</legend>
                      <label style={STYLES.columnOption}>
                        <input type="checkbox" checked disabled style={STYLES.checkbox} />
                        Product (required)
                      </label>
                      {COLUMN_OPTIONS.map((column) => (
                        <label style={STYLES.columnOption} key={column.key}>
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.key]}
                            onChange={(event) =>
                              setVisibleColumns((current) => ({
                                ...current,
                                [column.key]: event.currentTarget.checked,
                              }))
                            }
                            style={STYLES.checkbox}
                          />
                          {column.label}
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                </div>
              </div>
            </section>

            {selectedIds.size > 0 ? (
              <section
                className="gbpr-toolbar"
                data-testid="bulk-toolbar"
                aria-label="Bulk product actions"
                style={STYLES.bulkToolbar}
              >
                <div style={STYLES.bulkLead}>
                  <Boxes aria-hidden="true" />
                  <span>{selectedIds.size} selected</span>
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
                <div className="gbpr-toolbar-actions" style={{ flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    aria-pressed={pendingBulkOperation?.kind === "price"}
                    onClick={() => chooseBulkOperation({ kind: "price", value: "" })}
                  >
                    <PoundSterling aria-hidden="true" />
                    Set price
                  </button>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    aria-pressed={pendingBulkOperation?.kind === "stock"}
                    onClick={() => chooseBulkOperation({ kind: "stock", value: "" })}
                  >
                    <Boxes aria-hidden="true" />
                    Set stock
                  </button>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    aria-pressed={pendingBulkOperation?.kind === "vendor"}
                    onClick={() =>
                      chooseBulkOperation({ kind: "vendor", value: VENDORS[0] })
                    }
                  >
                    <Building2 aria-hidden="true" />
                    Change vendor
                  </button>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="secondary"
                    aria-pressed={pendingBulkOperation?.kind === "more"}
                    onClick={() => chooseBulkOperation({ kind: "more" })}
                  >
                    <MoreHorizontal aria-hidden="true" />
                    More actions
                  </button>
                </div>
                {renderBulkEditor()}
              </section>
            ) : null}

            {products.length === 0 ? (
              <section className="gbpr-empty-state">
                <div>
                  <PackageOpen aria-hidden="true" />
                  <h2>No products in this catalogue</h2>
                  <p>Add a product or import a price list to rebuild this preview.</p>
                  <div style={STYLES.emptyActions}>
                    <button
                      type="button"
                      className="gbpr-button"
                      data-variant="primary"
                      onClick={() => setFormState({ mode: "add" })}
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
                  </div>
                </div>
              </section>
            ) : filteredProducts.length === 0 ? (
              <section className="gbpr-empty-state">
                <div>
                  <Search aria-hidden="true" />
                  <h2>No products match these filters</h2>
                  <p>Adjust the search or clear the active filters to see the catalogue.</p>
                  <button
                    type="button"
                    className="gbpr-button"
                    data-variant="primary"
                    onClick={clearFilters}
                  >
                    <X aria-hidden="true" />
                    Clear filters
                  </button>
                </div>
              </section>
            ) : (
              <section className="gbpr-panel" style={STYLES.panel} aria-label="Products table">
                <div className="gbpr-table-wrap" style={STYLES.tableWrap}>
                  <table className="gbpr-table" style={STYLES.table}>
                    <caption className="gbpr-visually-hidden">
                      Product catalogue for {GROUP_BUY_NAME}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" style={STYLES.tableHeader}>
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all products"
                            style={STYLES.checkbox}
                          />
                        </th>
                        {renderSortableHeader("Product", "name")}
                        {visibleColumns.vendor ? renderSortableHeader("Vendor", "vendor") : null}
                        {visibleColumns.mgSize ? renderSortableHeader("Size", "mgSize") : null}
                        {visibleColumns.category ? renderSortableHeader("Category", "category") : null}
                        {visibleColumns.price ? renderSortableHeader("Price", "price") : null}
                        {visibleColumns.stock ? renderSortableHeader("Stock", "stock") : null}
                        {visibleColumns.maxPerCustomer
                          ? renderSortableHeader("Limit", "maxPerCustomer")
                          : null}
                        {visibleColumns.status ? renderSortableHeader("Status", "status") : null}
                        {visibleColumns.lastEdited
                          ? renderSortableHeader("Last edited", "lastEdited")
                          : null}
                        <th scope="col" style={STYLES.tableHeader}>
                          <span className="gbpr-visually-hidden">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const priceValue =
                          inlineValues[product.id]?.price ?? String(product.price);
                        const stockValue =
                          inlineValues[product.id]?.stock ??
                          (product.stock === null ? "" : String(product.stock));
                        const limitValue =
                          inlineValues[product.id]?.limit ??
                          (product.maxPerCustomer === null
                            ? ""
                            : String(product.maxPerCustomer));
                        const errors = inlineErrors[product.id] ?? {};
                        return (
                          <tr
                            key={product.id}
                            data-selected={selectedIds.has(product.id) ? "true" : undefined}
                            style={
                              selectedIds.has(product.id)
                                ? { background: "#F1F6FD" }
                                : undefined
                            }
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(product.id)}
                                onChange={() => toggleProduct(product.id)}
                                aria-label={`Select product ${product.name}`}
                                style={STYLES.checkbox}
                              />
                            </td>
                            <td>
                              <span style={STYLES.productCell}>
                                <strong style={STYLES.productName}>{product.name}</strong>
                                <span style={STYLES.productDescription}>{product.description}</span>
                              </span>
                            </td>
                            {visibleColumns.vendor ? <td>{product.vendor}</td> : null}
                            {visibleColumns.mgSize ? <td>{product.mgSize}</td> : null}
                            {visibleColumns.category ? <td>{product.category}</td> : null}
                            {visibleColumns.price ? (
                              <td>
                                <label className="gbpr-visually-hidden" htmlFor={`${product.id}-price`}>
                                  Price for {product.name}
                                </label>
                                <input
                                  id={`${product.id}-price`}
                                  className="gbpr-table-input gbpr-table-input-number"
                                  style={STYLES.cellInput}
                                  inputMode="decimal"
                                  value={priceValue}
                                  onChange={(event) =>
                                    setInlineValue(product.id, "price", event.currentTarget.value)
                                  }
                                  onBlur={() => saveInlineEdit(product, "price")}
                                  onKeyDown={(event) => handleInlineKeyDown(event, product, "price")}
                                  aria-invalid={errors.price ? "true" : undefined}
                                  aria-describedby={errors.price ? `${product.id}-price-error` : undefined}
                                />
                                {errors.price ? (
                                  <span
                                    className="gbpr-table-error"
                                    id={`${product.id}-price-error`}
                                    role="alert"
                                  >
                                    {errors.price}
                                  </span>
                                ) : null}
                              </td>
                            ) : null}
                            {visibleColumns.stock ? (
                              <td>
                                <label className="gbpr-visually-hidden" htmlFor={`${product.id}-stock`}>
                                  Stock for {product.name}
                                </label>
                                <input
                                  id={`${product.id}-stock`}
                                  className="gbpr-table-input gbpr-table-input-number"
                                  style={STYLES.cellInput}
                                  inputMode="numeric"
                                  value={stockValue}
                                  placeholder="Unlimited"
                                  onChange={(event) =>
                                    setInlineValue(product.id, "stock", event.currentTarget.value)
                                  }
                                  onBlur={() => saveInlineEdit(product, "stock")}
                                  onKeyDown={(event) => handleInlineKeyDown(event, product, "stock")}
                                  aria-invalid={errors.stock ? "true" : undefined}
                                  aria-describedby={errors.stock ? `${product.id}-stock-error` : undefined}
                                />
                                {errors.stock ? (
                                  <span
                                    className="gbpr-table-error"
                                    id={`${product.id}-stock-error`}
                                    role="alert"
                                  >
                                    {errors.stock}
                                  </span>
                                ) : null}
                              </td>
                            ) : null}
                            {visibleColumns.maxPerCustomer ? (
                              <td>
                                <label className="gbpr-visually-hidden" htmlFor={`${product.id}-limit`}>
                                  Maximum per customer for {product.name}
                                </label>
                                <input
                                  id={`${product.id}-limit`}
                                  className="gbpr-table-input gbpr-table-input-number"
                                  style={STYLES.cellInput}
                                  inputMode="numeric"
                                  value={limitValue}
                                  placeholder="No limit"
                                  onChange={(event) =>
                                    setInlineValue(product.id, "limit", event.currentTarget.value)
                                  }
                                  onBlur={() => saveInlineEdit(product, "limit")}
                                  onKeyDown={(event) => handleInlineKeyDown(event, product, "limit")}
                                  aria-invalid={errors.limit ? "true" : undefined}
                                  aria-describedby={errors.limit ? `${product.id}-limit-error` : undefined}
                                />
                                {errors.limit ? (
                                  <span
                                    className="gbpr-table-error"
                                    id={`${product.id}-limit-error`}
                                    role="alert"
                                  >
                                    {errors.limit}
                                  </span>
                                ) : null}
                              </td>
                            ) : null}
                            {visibleColumns.status ? (
                              <td><ProductStatusBadge product={product} /></td>
                            ) : null}
                            {visibleColumns.lastEdited ? (
                              <td>{DATE.format(new Date(product.lastEdited))}</td>
                            ) : null}
                            <td>
                              <div style={STYLES.rowActions}>
                                <button
                                  type="button"
                                  className="gbpr-button"
                                  data-variant="ghost"
                                  aria-label={`Actions for ${product.name}`}
                                  aria-expanded={openRowActionsId === product.id}
                                  onClick={() =>
                                    setOpenRowActionsId((current) =>
                                      current === product.id ? null : product.id,
                                    )
                                  }
                                >
                                  <MoreHorizontal aria-hidden="true" />
                                </button>
                                {openRowActionsId === product.id ? (
                                  <div style={STYLES.rowMenu} aria-label={`Actions for ${product.name}`}>
                                    <button
                                      type="button"
                                      className="gbpr-button"
                                      data-variant="ghost"
                                      onClick={() => {
                                        setFormState({ mode: "edit", productId: product.id });
                                        setOpenRowActionsId(null);
                                      }}
                                    >
                                      <PoundSterling aria-hidden="true" />
                                      Edit product
                                    </button>
                                    <button
                                      type="button"
                                      className="gbpr-button"
                                      data-variant="danger-ghost"
                                      onClick={() => {
                                        setConfirmationState({
                                          kind: "delete-product",
                                          productId: product.id,
                                        });
                                        setOpenRowActionsId(null);
                                      }}
                                    >
                                      <Trash2 aria-hidden="true" />
                                      Delete product
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
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
        onCancel={() => setConfirmationState(null)}
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
