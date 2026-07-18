import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  History,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
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
  applyBulkPatch,
  classifyImportRows,
  resetProducts,
  type ProductPatch,
} from "./_shared/model";
import "./_group.css";

type Conditions = {
  query: string;
  vendor: string;
  category: string;
};

type HalfKitChange = "unchanged" | "enabled" | "disabled";

type FieldChanges = {
  price: string;
  stock: string;
  maxPerCustomer: string;
  halfKitEnabled: HalfKitChange;
};

type FieldChangeKey = keyof FieldChanges;

type ValidationError = {
  field: Exclude<FieldChangeKey, "halfKitEnabled">;
  message: string;
};

type PreviewRow = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  before: ProductRecord;
  after: ProductRecord;
};

type AppliedChangeSet = {
  id: string;
  name: string;
  affectedCount: number;
  changes: string[];
  appliedAt: string;
};

type ToolState =
  | { kind: "form"; productId: string | null }
  | { kind: "import"; mode: "csv" | "ai" }
  | null;

type FeedbackState = {
  message: string;
  previousProducts: ProductRecord[];
  previousApplied: AppliedChangeSet[];
};

const DEFAULT_CONDITIONS: Conditions = {
  query: "",
  vendor: "QSC",
  category: "GLP-1",
};

const EMPTY_FIELD_CHANGES: FieldChanges = {
  price: "",
  stock: "",
  maxPerCustomer: "",
  halfKitEnabled: "unchanged",
};

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
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
  changeSet: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid var(--gbpr-border)",
    borderRadius: 8,
    background: "var(--gbpr-panel)",
    boxShadow: "var(--gbpr-shadow-panel)",
  },
  changeSetHeader: {
    display: "flex",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    borderBottom: "1px solid var(--gbpr-border)",
    padding: "12px 16px",
    background: "#FBFCFE",
  },
  changeSetIdentity: {
    display: "flex",
    minWidth: 0,
    flex: "1 1 420px",
    alignItems: "center",
    gap: 11,
  },
  changeSetIcon: {
    display: "grid",
    flex: "0 0 42px",
    width: 42,
    height: 42,
    placeItems: "center",
    borderRadius: 7,
    color: "var(--gbpr-navy)",
    background: "#EAF1FC",
  },
  changeSetIconSvg: {
    width: 20,
    height: 20,
  },
  nameField: {
    display: "grid",
    minWidth: 220,
    flex: "1 1 360px",
    gap: 4,
  },
  nameLabel: {
    color: "var(--gbpr-subtle)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  nameInput: {
    width: "100%",
    height: 44,
    border: "1px solid var(--gbpr-border)",
    borderRadius: 7,
    padding: "0 11px",
    color: "var(--gbpr-ink)",
    background: "#FFFFFF",
    fontSize: 14,
    fontWeight: 720,
  },
  headerMetrics: {
    display: "flex",
    alignItems: "stretch",
    gap: 8,
  },
  metric: {
    display: "grid",
    minWidth: 98,
    minHeight: 48,
    alignContent: "center",
    gap: 2,
    borderLeft: "3px solid var(--gbpr-border)",
    padding: "4px 10px",
  },
  metricError: {
    borderLeftColor: "var(--gbpr-danger)",
    color: "var(--gbpr-danger)",
  },
  metricValue: {
    fontSize: 17,
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  metricLabel: {
    color: "var(--gbpr-muted)",
    fontSize: 9,
    fontWeight: 700,
  },
  studioLayout: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1fr) minmax(230px, 280px)",
  },
  stages: {
    display: "grid",
    minWidth: 0,
  },
  stage: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "150px minmax(0, 1fr)",
    gap: 16,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: 16,
  },
  stageLast: {
    borderBottom: 0,
  },
  stageHeading: {
    display: "flex",
    minWidth: 0,
    alignItems: "flex-start",
    gap: 9,
  },
  stageNumber: {
    display: "grid",
    flex: "0 0 28px",
    width: 28,
    height: 28,
    placeItems: "center",
    borderRadius: 7,
    color: "#FFFFFF",
    background: "var(--gbpr-navy)",
    fontSize: 10,
    fontWeight: 800,
  },
  stageTitle: {
    margin: "1px 0 2px",
    fontSize: 12,
    fontWeight: 790,
    letterSpacing: 0,
  },
  stageHint: {
    margin: 0,
    color: "var(--gbpr-muted)",
    fontSize: 9,
    lineHeight: 1.4,
  },
  conditionGrid: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(170px, 1.3fr) repeat(2, minmax(130px, 1fr))",
    gap: 10,
  },
  searchField: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    top: 37,
    left: 12,
    width: 16,
    height: 16,
    color: "var(--gbpr-subtle)",
    pointerEvents: "none",
  },
  searchInput: {
    paddingLeft: 36,
  },
  changesGrid: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
    gap: 10,
  },
  choiceGroup: {
    display: "grid",
    minWidth: 0,
    gridColumn: "1 / -1",
    gap: 6,
    border: 0,
    margin: 0,
    padding: 0,
  },
  choiceLegend: {
    color: "#2D3E55",
    fontSize: 11,
    fontWeight: 720,
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    overflow: "hidden",
    border: "1px solid var(--gbpr-border)",
    borderRadius: 7,
  },
  segmentLabel: {
    display: "flex",
    minWidth: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRight: "1px solid var(--gbpr-border)",
    padding: "6px 8px",
    color: "var(--gbpr-muted)",
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 720,
    textAlign: "center",
  },
  segmentInput: {
    width: 16,
    height: 16,
    margin: 0,
    accentColor: "var(--gbpr-blue)",
  },
  review: {
    display: "grid",
    minWidth: 0,
    gap: 10,
  },
  reviewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  reviewCopy: {
    margin: 0,
    color: "var(--gbpr-muted)",
    fontSize: 10,
  },
  reviewTableWrap: {
    width: "100%",
    maxHeight: 350,
    overflow: "auto",
    border: "1px solid var(--gbpr-border-soft)",
    borderRadius: 7,
    overscrollBehavior: "contain",
  },
  reviewTable: {
    minWidth: 720,
  },
  productName: {
    display: "grid",
    gap: 2,
  },
  productNameStrong: {
    color: "var(--gbpr-ink)",
    fontSize: 11,
    fontWeight: 760,
  },
  productMeta: {
    color: "var(--gbpr-muted)",
    fontSize: 9,
  },
  valueStack: {
    display: "grid",
    gap: 2,
    fontVariantNumeric: "tabular-nums",
  },
  valueMuted: {
    color: "var(--gbpr-subtle)",
    fontSize: 9,
  },
  valueChanged: {
    color: "var(--gbpr-navy)",
    fontSize: 10,
    fontWeight: 740,
  },
  emptyPreview: {
    display: "grid",
    minHeight: 126,
    placeItems: "center",
    border: "1px dashed var(--gbpr-border)",
    borderRadius: 7,
    padding: 18,
    color: "var(--gbpr-muted)",
    background: "#FBFCFE",
    textAlign: "center",
  },
  emptyIcon: {
    width: 24,
    height: 24,
    marginBottom: 7,
    color: "var(--gbpr-subtle)",
  },
  summary: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    borderLeft: "1px solid var(--gbpr-border)",
    background: "#FBFCFE",
  },
  summarySection: {
    display: "grid",
    gap: 10,
    borderBottom: "1px solid var(--gbpr-border-soft)",
    padding: 16,
  },
  summaryTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: 0,
    fontSize: 12,
    fontWeight: 790,
    letterSpacing: 0,
  },
  summaryTitleIcon: {
    width: 16,
    height: 16,
    color: "var(--gbpr-navy)",
  },
  summaryList: {
    display: "grid",
    gap: 7,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  summaryItem: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    color: "var(--gbpr-muted)",
    fontSize: 10,
    lineHeight: 1.4,
  },
  summaryItemStrong: {
    color: "var(--gbpr-ink)",
    fontWeight: 740,
    textAlign: "right",
  },
  errorList: {
    display: "grid",
    gap: 5,
    margin: 0,
    padding: 0,
    color: "var(--gbpr-danger)",
    fontSize: 9,
    fontWeight: 650,
    listStyle: "none",
  },
  historyItem: {
    display: "grid",
    gap: 3,
    borderLeft: "2px solid var(--gbpr-border)",
    paddingLeft: 9,
  },
  historyName: {
    color: "var(--gbpr-ink)",
    fontSize: 10,
    fontWeight: 740,
  },
  historyMeta: {
    color: "var(--gbpr-muted)",
    fontSize: 9,
    lineHeight: 1.4,
  },
  applyFooter: {
    display: "grid",
    gap: 8,
    padding: 16,
  },
  applyButton: {
    width: "100%",
  },
  applyHint: {
    margin: 0,
    color: "var(--gbpr-muted)",
    fontSize: 9,
    lineHeight: 1.45,
    textAlign: "center",
  },
  editButton: {
    minWidth: 44,
    width: 44,
    padding: 0,
  },
};

function cloneProducts(products: readonly ProductRecord[]): ProductRecord[] {
  return products.map((product) => ({ ...product }));
}

function validateFieldChanges(fieldChanges: FieldChanges): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fieldChanges.price.trim()) {
    const price = Number(fieldChanges.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({
        field: "price",
        message: "Price must be zero or more.",
      });
    }
  }

  if (fieldChanges.stock.trim()) {
    const stock = Number(fieldChanges.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.push({
        field: "stock",
        message: "Stock must be a non-negative whole number.",
      });
    }
  }

  if (fieldChanges.maxPerCustomer.trim()) {
    const maximum = Number(fieldChanges.maxPerCustomer);
    if (!Number.isInteger(maximum) || maximum < 1) {
      errors.push({
        field: "maxPerCustomer",
        message: "Limit must be a whole number of at least 1.",
      });
    }
  }

  return errors;
}

function createPatch(
  fieldChanges: FieldChanges,
  validationErrors: readonly ValidationError[],
): ProductPatch {
  const invalidFields = new Set(validationErrors.map((error) => error.field));
  const patch: ProductPatch = {};

  if (fieldChanges.price.trim() && !invalidFields.has("price")) {
    patch.price = Number(fieldChanges.price);
  }
  if (fieldChanges.stock.trim() && !invalidFields.has("stock")) {
    patch.stock = Number(fieldChanges.stock);
  }
  if (
    fieldChanges.maxPerCustomer.trim() &&
    !invalidFields.has("maxPerCustomer")
  ) {
    patch.maxPerCustomer = Number(fieldChanges.maxPerCustomer);
  }
  if (fieldChanges.halfKitEnabled !== "unchanged") {
    patch.halfKitEnabled = fieldChanges.halfKitEnabled === "enabled";
  }

  return patch;
}

function matchesConditions(
  product: ProductRecord,
  conditions: Conditions,
): boolean {
  const query = conditions.query.trim().toLowerCase();
  const queryMatches =
    !query ||
    [product.name, product.vendor, product.category, product.mgSize].some(
      (value) => value.toLowerCase().includes(query),
    );
  const vendorMatches =
    conditions.vendor === "all" || product.vendor === conditions.vendor;
  const categoryMatches =
    conditions.category === "all" || product.category === conditions.category;

  return queryMatches && vendorMatches && categoryMatches;
}

function createPreviewRows(
  products: readonly ProductRecord[],
  conditions: Conditions,
  patch: ProductPatch,
): PreviewRow[] {
  if (Object.keys(patch).length === 0) return [];

  return products
    .filter((product) => matchesConditions(product, conditions))
    .map((product) => {
      const before = { ...product };
      const after = { ...product, ...patch };
      return {
        id: product.id,
        name: product.name,
        vendor: product.vendor,
        category: product.category,
        before,
        after,
      };
    });
}

function describePatch(patch: ProductPatch): string[] {
  const descriptions: string[] = [];
  if (patch.price !== undefined)
    descriptions.push(`Price to ${MONEY.format(patch.price)}`);
  if (patch.stock !== undefined) descriptions.push(`Stock to ${patch.stock}`);
  if (patch.maxPerCustomer !== undefined) {
    descriptions.push(`Limit to ${patch.maxPerCustomer}`);
  }
  if (patch.halfKitEnabled !== undefined) {
    descriptions.push(
      patch.halfKitEnabled ? "Enable half kits" : "Disable half kits",
    );
  }
  return descriptions;
}

function productValueSummary(product: ProductRecord): string[] {
  return [
    MONEY.format(product.price),
    product.stock === null ? "Unlimited stock" : `${product.stock} stock`,
    product.maxPerCustomer === null
      ? "No limit"
      : `Limit ${product.maxPerCustomer}`,
    product.halfKitEnabled ? "Half kits on" : "Half kits off",
  ];
}

function productIdentity(
  product: Pick<ProductRecord, "name" | "vendor" | "mgSize">,
): string {
  return [product.name, product.vendor, product.mgSize]
    .map((value) => value.trim().toLowerCase())
    .join("\u001f");
}

function createImportCandidates(
  mode: "csv" | "ai",
  products: readonly ProductRecord[],
): ImportCandidate[] {
  const first = products[0];
  const second = products[1] ?? first;
  const rows: ImportCandidate[] = [];

  if (first) {
    rows.push({
      name: first.name,
      vendor: first.vendor,
      mgSize: first.mgSize,
      price: first.price,
    });
  }
  if (second) {
    rows.push({
      name: second.name,
      vendor: second.vendor,
      mgSize: second.mgSize,
      price: second.price + 5,
    });
  }

  rows.push({
    name: mode === "csv" ? "Mazdutide Batch Import" : "Cagrilintide Extract",
    vendor: mode === "csv" ? "QSC" : "Unassigned",
    mgSize: mode === "csv" ? "10 mg" : "5 mg",
    price: mode === "csv" ? 63.5 : 71,
  });

  return rows;
}

function hasError(
  validationErrors: readonly ValidationError[],
  field: ValidationError["field"],
): boolean {
  return validationErrors.some((error) => error.field === field);
}

export default function BatchStudio() {
  const productSequenceRef = useRef(1);
  const historySequenceRef = useRef(1);
  const [products, setProducts] = useState<ProductRecord[]>(() =>
    cloneProducts(SAMPLE_PRODUCTS),
  );
  const [conditions, setConditions] = useState<Conditions>(() => ({
    ...DEFAULT_CONDITIONS,
  }));
  const [fieldChanges, setFieldChanges] = useState<FieldChanges>(() => ({
    ...EMPTY_FIELD_CHANGES,
  }));
  const [changeSetName, setChangeSetName] = useState(
    "QSC GLP-1 supplier refresh",
  );
  const [applied, setApplied] = useState<AppliedChangeSet[]>([]);
  const [tool, setTool] = useState<ToolState>(null);
  const [importRows, setImportRows] = useState<ImportReviewRow[]>([]);
  const [applyConfirmationOpen, setApplyConfirmationOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const validationErrors = useMemo(
    () => validateFieldChanges(fieldChanges),
    [fieldChanges],
  );
  const stagedPatch = useMemo(
    () => createPatch(fieldChanges, validationErrors),
    [fieldChanges, validationErrors],
  );
  const previewRows = useMemo(
    () => createPreviewRows(products, conditions, stagedPatch),
    [conditions, products, stagedPatch],
  );
  const changeDescriptions = useMemo(
    () => describePatch(stagedPatch),
    [stagedPatch],
  );
  const applyDisabled = previewRows.length === 0 || validationErrors.length > 0;

  function updateCondition<Key extends keyof Conditions>(
    field: Key,
    value: Conditions[Key],
  ) {
    setConditions((current) => ({ ...current, [field]: value }));
  }

  function updateFieldChange<Key extends FieldChangeKey>(
    field: Key,
    value: FieldChanges[Key],
  ) {
    setFieldChanges((current) => ({ ...current, [field]: value }));
  }

  function clearDraft() {
    setConditions({ ...DEFAULT_CONDITIONS });
    setFieldChanges({ ...EMPTY_FIELD_CHANGES });
    setChangeSetName("");
  }

  function requestApply() {
    if (applyDisabled) return;
    setApplyConfirmationOpen(true);
  }

  function confirmApply() {
    if (applyDisabled) {
      setApplyConfirmationOpen(false);
      return;
    }

    const previousProducts = cloneProducts(products);
    const previousApplied = applied.map((entry) => ({
      ...entry,
      changes: [...entry.changes],
    }));
    const affectedIds = previewRows.map((row) => row.id);
    const appliedAt = new Date().toISOString();
    const appliedName = changeSetName.trim() || "Untitled change set";
    const nextProducts = applyBulkPatch(products, affectedIds, {
      ...stagedPatch,
      lastEdited: appliedAt,
    });
    const historyEntry: AppliedChangeSet = {
      id: `batch-history-${historySequenceRef.current++}`,
      name: appliedName,
      affectedCount: affectedIds.length,
      changes: [...changeDescriptions],
      appliedAt,
    };

    setProducts(nextProducts);
    setApplied((current) => [historyEntry, ...current].slice(0, 6));
    setFeedback({
      message: `${appliedName} applied to ${affectedIds.length} ${affectedIds.length === 1 ? "product" : "products"}.`,
      previousProducts,
      previousApplied,
    });
    setApplyConfirmationOpen(false);
    clearDraft();
  }

  function undoLastAction() {
    if (!feedback) return;
    setProducts(cloneProducts(feedback.previousProducts));
    setApplied(
      feedback.previousApplied.map((entry) => ({
        ...entry,
        changes: [...entry.changes],
      })),
    );
    setFeedback(null);
  }

  function openImport(mode: "csv" | "ai") {
    setImportRows(
      classifyImportRows(products, createImportCandidates(mode, products)),
    );
    setTool({ kind: "import", mode });
  }

  function editImportRow(
    rowId: ImportReviewRow["id"],
    patch: Partial<
      Pick<ImportReviewRow, "name" | "price" | "vendor" | "mgSize">
    >,
  ) {
    setImportRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function confirmImport() {
    const previousProducts = cloneProducts(products);
    const previousApplied = applied.map((entry) => ({
      ...entry,
      changes: [...entry.changes],
    }));
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
          id: `batch-import-${productSequenceRef.current++}`,
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
      message: `${acceptedRows.length} ${acceptedRows.length === 1 ? "product" : "products"} imported.`,
      previousProducts,
      previousApplied,
    });
    setTool(null);
    setImportRows([]);
  }

  function saveProduct(patch: Partial<Omit<ProductRecord, "id">>) {
    const previousProducts = cloneProducts(products);
    const previousApplied = applied.map((entry) => ({
      ...entry,
      changes: [...entry.changes],
    }));
    const editingId = tool?.kind === "form" ? tool.productId : null;

    if (editingId) {
      setProducts((current) =>
        applyBulkPatch(current, [editingId], {
          ...patch,
          lastEdited: new Date().toISOString(),
        }),
      );
      setFeedback({
        message: `${patch.name ?? "Product"} updated.`,
        previousProducts,
        previousApplied,
      });
    } else {
      const nextProduct: ProductRecord = {
        id: `batch-product-${productSequenceRef.current++}`,
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
      setFeedback({
        message: `${nextProduct.name} added.`,
        previousProducts,
        previousApplied,
      });
    }

    setTool(null);
  }

  function resetStudio() {
    setProducts((current) => resetProducts(current));
    setConditions({ ...DEFAULT_CONDITIONS });
    setFieldChanges({ ...EMPTY_FIELD_CHANGES });
    setChangeSetName("QSC GLP-1 supplier refresh");
    setApplied([]);
    setTool(null);
    setImportRows([]);
    setApplyConfirmationOpen(false);
    setFeedback(null);
  }

  const formProduct =
    tool?.kind === "form" && tool.productId
      ? (products.find((product) => product.id === tool.productId) ?? null)
      : null;

  return (
    <ProductShell
      concept="Batch Studio"
      pageTitle="Batch Studio"
      onReset={resetStudio}
    >
      <div style={STYLES.workspace}>
        <header style={STYLES.pageHeader}>
          <div>
            <h2 style={STYLES.pageHeading}>Batch Studio</h2>
            <p style={STYLES.pageCopy}>
              Build a reviewable catalogue change for {GROUP_BUY_NAME}, inspect
              every diff, then apply it as one recoverable action.
            </p>
          </div>
          <div
            style={STYLES.headerActions}
            aria-label="Secondary product actions"
          >
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
            product={formProduct}
            onSave={saveProduct}
            onCancel={() => setTool(null)}
          />
        ) : tool?.kind === "import" ? (
          <ImportReview
            rows={importRows}
            mode={tool.mode}
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
        ) : null}

        <section data-testid="change-set" style={STYLES.changeSet}>
          <header style={STYLES.changeSetHeader}>
            <div style={STYLES.changeSetIdentity}>
              <span style={STYLES.changeSetIcon} aria-hidden="true">
                <Layers3 style={STYLES.changeSetIconSvg} />
              </span>
              <label style={STYLES.nameField}>
                <span style={STYLES.nameLabel}>Change set</span>
                <input
                  style={STYLES.nameInput}
                  value={changeSetName}
                  onChange={(event) =>
                    setChangeSetName(event.currentTarget.value)
                  }
                  placeholder="Name this change set"
                  autoComplete="off"
                />
              </label>
            </div>
            <div style={STYLES.headerMetrics}>
              <div style={STYLES.metric}>
                <strong style={STYLES.metricValue}>{previewRows.length}</strong>
                <span style={STYLES.metricLabel}>Affected products</span>
              </div>
              <div
                style={{
                  ...STYLES.metric,
                  ...(validationErrors.length > 0 ? STYLES.metricError : {}),
                }}
              >
                <strong style={STYLES.metricValue}>
                  {validationErrors.length}
                </strong>
                <span style={STYLES.metricLabel}>Validation errors</span>
              </div>
            </div>
          </header>

          <div style={STYLES.studioLayout}>
            <div style={STYLES.stages}>
              <section style={STYLES.stage}>
                <div style={STYLES.stageHeading}>
                  <span style={STYLES.stageNumber}>1</span>
                  <div>
                    <h3 style={STYLES.stageTitle}>Choose products</h3>
                    <p style={STYLES.stageHint}>Define the catalogue query.</p>
                  </div>
                </div>
                <div style={STYLES.conditionGrid}>
                  <div className="gbpr-field" style={STYLES.searchField}>
                    <label htmlFor="batch-query">Search products</label>
                    <Search style={STYLES.searchIcon} aria-hidden="true" />
                    <input
                      id="batch-query"
                      style={STYLES.searchInput}
                      value={conditions.query}
                      onChange={(event) =>
                        updateCondition("query", event.currentTarget.value)
                      }
                      placeholder="Name, size, vendor"
                      autoComplete="off"
                    />
                  </div>
                  <div className="gbpr-field">
                    <label htmlFor="batch-vendor">Vendor</label>
                    <select
                      id="batch-vendor"
                      value={conditions.vendor}
                      onChange={(event) =>
                        updateCondition("vendor", event.currentTarget.value)
                      }
                    >
                      <option value="all">All vendors</option>
                      {VENDORS.map((vendor) => (
                        <option value={vendor} key={vendor}>
                          {vendor}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="gbpr-field">
                    <label htmlFor="batch-category">Category</label>
                    <select
                      id="batch-category"
                      value={conditions.category}
                      onChange={(event) =>
                        updateCondition("category", event.currentTarget.value)
                      }
                    >
                      <option value="all">All categories</option>
                      {CATEGORIES.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section style={STYLES.stage}>
                <div style={STYLES.stageHeading}>
                  <span style={STYLES.stageNumber}>2</span>
                  <div>
                    <h3 style={STYLES.stageTitle}>Stage changes</h3>
                    <p style={STYLES.stageHint}>Blank fields stay unchanged.</p>
                  </div>
                </div>
                <div style={STYLES.changesGrid}>
                  <div className="gbpr-field">
                    <label htmlFor="batch-price">Set price</label>
                    <input
                      id="batch-price"
                      type="number"
                      step="0.01"
                      value={fieldChanges.price}
                      onChange={(event) =>
                        updateFieldChange("price", event.currentTarget.value)
                      }
                      placeholder="Leave unchanged"
                      aria-invalid={
                        hasError(validationErrors, "price") || undefined
                      }
                      aria-describedby={
                        hasError(validationErrors, "price")
                          ? "batch-price-error"
                          : undefined
                      }
                    />
                    {hasError(validationErrors, "price") ? (
                      <span className="gbpr-field-error" id="batch-price-error">
                        Price must be zero or more.
                      </span>
                    ) : null}
                  </div>
                  <div className="gbpr-field">
                    <label htmlFor="batch-stock">Set stock</label>
                    <input
                      id="batch-stock"
                      type="number"
                      step="1"
                      value={fieldChanges.stock}
                      onChange={(event) =>
                        updateFieldChange("stock", event.currentTarget.value)
                      }
                      placeholder="Leave unchanged"
                      aria-invalid={
                        hasError(validationErrors, "stock") || undefined
                      }
                      aria-describedby={
                        hasError(validationErrors, "stock")
                          ? "batch-stock-error"
                          : undefined
                      }
                    />
                    {hasError(validationErrors, "stock") ? (
                      <span className="gbpr-field-error" id="batch-stock-error">
                        Stock must be a non-negative whole number.
                      </span>
                    ) : null}
                  </div>
                  <div className="gbpr-field">
                    <label htmlFor="batch-limit">
                      Set maximum per customer
                    </label>
                    <input
                      id="batch-limit"
                      type="number"
                      step="1"
                      value={fieldChanges.maxPerCustomer}
                      onChange={(event) =>
                        updateFieldChange(
                          "maxPerCustomer",
                          event.currentTarget.value,
                        )
                      }
                      placeholder="Leave unchanged"
                      aria-invalid={
                        hasError(validationErrors, "maxPerCustomer") ||
                        undefined
                      }
                      aria-describedby={
                        hasError(validationErrors, "maxPerCustomer")
                          ? "batch-limit-error"
                          : undefined
                      }
                    />
                    {hasError(validationErrors, "maxPerCustomer") ? (
                      <span className="gbpr-field-error" id="batch-limit-error">
                        Limit must be a whole number of at least 1.
                      </span>
                    ) : null}
                  </div>
                  <fieldset style={STYLES.choiceGroup}>
                    <legend style={STYLES.choiceLegend}>Half kits</legend>
                    <div style={STYLES.segmented}>
                      {(
                        [
                          ["unchanged", "Unchanged"],
                          ["enabled", "Enable"],
                          ["disabled", "Disable"],
                        ] as const
                      ).map(([value, label], index) => (
                        <label
                          style={{
                            ...STYLES.segmentLabel,
                            ...(index === 2 ? { borderRight: 0 } : {}),
                            ...(fieldChanges.halfKitEnabled === value
                              ? {
                                  color: "var(--gbpr-navy)",
                                  background: "#EAF1FC",
                                }
                              : {}),
                          }}
                          key={value}
                        >
                          <input
                            type="radio"
                            name="batch-half-kits"
                            value={value}
                            checked={fieldChanges.halfKitEnabled === value}
                            onChange={() =>
                              updateFieldChange("halfKitEnabled", value)
                            }
                            style={STYLES.segmentInput}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </section>

              <section style={{ ...STYLES.stage, ...STYLES.stageLast }}>
                <div style={STYLES.stageHeading}>
                  <span style={STYLES.stageNumber}>3</span>
                  <div>
                    <h3 style={STYLES.stageTitle}>Review</h3>
                    <p style={STYLES.stageHint}>
                      Confirm every before/after diff.
                    </p>
                  </div>
                </div>
                <div style={STYLES.review}>
                  <div style={STYLES.reviewHeader}>
                    <p style={STYLES.reviewCopy}>
                      {previewRows.length > 0
                        ? `${previewRows.length} ${previewRows.length === 1 ? "product" : "products"} match this change set.`
                        : "Stage at least one valid field update to build a preview."}
                    </p>
                    {previewRows.length > 0 ? (
                      <span className="gbpr-status" data-tone="info">
                        Immutable preview
                      </span>
                    ) : null}
                  </div>

                  {previewRows.length > 0 ? (
                    <div style={STYLES.reviewTableWrap}>
                      <table
                        className="gbpr-table"
                        style={STYLES.reviewTable}
                        aria-label="Affected products"
                      >
                        <thead>
                          <tr>
                            <th scope="col">Product</th>
                            <th scope="col">Before</th>
                            <th scope="col">After</th>
                            <th scope="col">Edit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <span style={STYLES.productName}>
                                  <strong style={STYLES.productNameStrong}>
                                    {row.name}
                                  </strong>
                                  <span style={STYLES.productMeta}>
                                    {row.vendor} / {row.category}
                                  </span>
                                </span>
                              </td>
                              <td>
                                <span style={STYLES.valueStack}>
                                  {productValueSummary(row.before).map(
                                    (value) => (
                                      <span
                                        style={STYLES.valueMuted}
                                        key={value}
                                      >
                                        {value}
                                      </span>
                                    ),
                                  )}
                                </span>
                              </td>
                              <td>
                                <span style={STYLES.valueStack}>
                                  {productValueSummary(row.after).map(
                                    (value) => (
                                      <strong
                                        style={STYLES.valueChanged}
                                        key={value}
                                      >
                                        {value}
                                      </strong>
                                    ),
                                  )}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="gbpr-button"
                                  data-variant="ghost"
                                  style={STYLES.editButton}
                                  aria-label={`Edit ${row.name}`}
                                  title="Edit product"
                                  onClick={() =>
                                    setTool({ kind: "form", productId: row.id })
                                  }
                                >
                                  <Pencil aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={STYLES.emptyPreview}>
                      <div>
                        <ClipboardCheck
                          style={STYLES.emptyIcon}
                          aria-hidden="true"
                        />
                        <div>No affected products to review yet.</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside style={STYLES.summary} aria-label="Change set summary">
              <section style={STYLES.summarySection}>
                <h3 style={STYLES.summaryTitle}>
                  <Filter style={STYLES.summaryTitleIcon} aria-hidden="true" />
                  Change summary
                </h3>
                <ul style={STYLES.summaryList}>
                  <li style={STYLES.summaryItem}>
                    <span>Vendor</span>
                    <strong style={STYLES.summaryItemStrong}>
                      {conditions.vendor === "all"
                        ? "All vendors"
                        : conditions.vendor}
                    </strong>
                  </li>
                  <li style={STYLES.summaryItem}>
                    <span>Category</span>
                    <strong style={STYLES.summaryItemStrong}>
                      {conditions.category === "all"
                        ? "All categories"
                        : conditions.category}
                    </strong>
                  </li>
                  <li style={STYLES.summaryItem}>
                    <span>Field updates</span>
                    <strong style={STYLES.summaryItemStrong}>
                      {changeDescriptions.length}
                    </strong>
                  </li>
                  <li style={STYLES.summaryItem}>
                    <span>Affected</span>
                    <strong style={STYLES.summaryItemStrong}>
                      {previewRows.length} products
                    </strong>
                  </li>
                </ul>
                {changeDescriptions.length > 0 ? (
                  <ul style={STYLES.summaryList}>
                    {changeDescriptions.map((description) => (
                      <li style={STYLES.summaryItem} key={description}>
                        <CheckCircle2
                          style={STYLES.summaryTitleIcon}
                          aria-hidden="true"
                        />
                        <strong style={STYLES.summaryItemStrong}>
                          {description}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section style={STYLES.summarySection} aria-live="polite">
                <h3 style={STYLES.summaryTitle}>
                  <ClipboardCheck
                    style={STYLES.summaryTitleIcon}
                    aria-hidden="true"
                  />
                  Validation errors
                </h3>
                {validationErrors.length > 0 ? (
                  <ul style={STYLES.errorList}>
                    {validationErrors.map((error) => (
                      <li key={error.field}>{error.message}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={STYLES.historyMeta}>No blocking errors.</span>
                )}
              </section>

              <section style={STYLES.summarySection}>
                <h3 style={STYLES.summaryTitle}>
                  <History style={STYLES.summaryTitleIcon} aria-hidden="true" />
                  Recent change sets
                </h3>
                {applied.length > 0 ? (
                  <ol style={STYLES.summaryList}>
                    {applied.map((entry) => (
                      <li style={STYLES.historyItem} key={entry.id}>
                        <strong style={STYLES.historyName}>{entry.name}</strong>
                        <span style={STYLES.historyMeta}>
                          {entry.affectedCount} products /{" "}
                          {DATE_TIME.format(new Date(entry.appliedAt))}
                        </span>
                        <span style={STYLES.historyMeta}>
                          {entry.changes.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span style={STYLES.historyMeta}>
                    No change sets applied yet.
                  </span>
                )}
              </section>

              <footer style={STYLES.applyFooter}>
                <button
                  type="button"
                  className="gbpr-button"
                  data-variant="primary"
                  data-testid="apply-change-set"
                  style={STYLES.applyButton}
                  disabled={applyDisabled}
                  onClick={requestApply}
                >
                  Apply changes
                  <ArrowRight aria-hidden="true" />
                </button>
                <p style={STYLES.applyHint}>
                  Confirmation is required before catalogue values change.
                </p>
              </footer>
            </aside>
          </div>
        </section>
      </div>

      <ConfirmAction
        open={applyConfirmationOpen}
        title="Apply this change set?"
        description={`This will update ${previewRows.length} ${previewRows.length === 1 ? "product" : "products"}. You can undo the action after it is applied.`}
        confirmLabel="Apply changes"
        tone="primary"
        onConfirm={confirmApply}
        onCancel={() => setApplyConfirmationOpen(false)}
      />

      {feedback ? (
        <MockFeedback
          message={feedback.message}
          onUndo={undoLastAction}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </ProductShell>
  );
}
