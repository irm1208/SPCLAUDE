import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  CATEGORIES,
  VENDORS,
  type ImportReviewRow,
  type ProductRecord,
} from "../data";

export type ProductFormProps = {
  product: ProductRecord | null;
  onSave: (patch: Partial<Omit<ProductRecord, "id">>) => void;
  onCancel: () => void;
};

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

type ProductFormErrors = Partial<
  Record<"name" | "price" | "vendor" | "stock" | "maxPerCustomer", string>
>;

function createProductDraft(product: ProductRecord | null): ProductDraft {
  if (!product) {
    return {
      name: "",
      price: "",
      vendor: "",
      category: CATEGORIES[0],
      mgSize: "",
      stock: "",
      maxPerCustomer: "",
      visible: true,
      halfKitEnabled: false,
    };
  }

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

function validateProductDraft(draft: ProductDraft): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const price = Number(draft.price);

  if (!draft.name.trim()) {
    errors.name = "Enter a product name.";
  }
  if (!draft.vendor.trim()) {
    errors.vendor = "Choose a vendor.";
  }
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
    errors.price = "Enter a finite price of zero or more.";
  }

  if (draft.stock.trim()) {
    const stock = Number(draft.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = "Use a whole stock number of zero or more, or leave blank.";
    }
  }

  if (draft.maxPerCustomer.trim()) {
    const maximum = Number(draft.maxPerCustomer);
    if (!Number.isInteger(maximum) || maximum < 1) {
      errors.maxPerCustomer =
        "Use a whole maximum of one or more, or leave blank.";
    }
  }

  return errors;
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<ProductDraft>(() =>
    createProductDraft(product),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");
  const editing = product !== null;

  useEffect(() => {
    setDraft(createProductDraft(product));
    setErrors({});
    setDeleteOpen(false);
    setDeleteNotice("");
  }, [product]);

  function updateDraft<Key extends keyof ProductDraft>(
    field: Key,
    value: ProductDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearError(field: keyof ProductFormErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProductDraft(draft);
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstError}"]`)
          ?.focus();
      });
      return;
    }

    onSave({
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
    });
  }

  return (
    <section className="gbpr-form-panel" aria-labelledby={`${formId}-title`}>
      <form ref={formRef} className="gbpr-form" noValidate onSubmit={handleSubmit}>
        <header className="gbpr-form-header">
          <div>
            <span className="gbpr-eyebrow">Product details</span>
            <h2 id={`${formId}-title`}>
              {editing ? "Edit Product" : "Add Product"}
            </h2>
            <p>
              Set the catalogue details, availability, and order limits for this
              group buy.
            </p>
          </div>
        </header>

        <div className="gbpr-form-grid">
          <div className="gbpr-field gbpr-field-span-2">
            <label htmlFor={`${formId}-name`}>Name</label>
            <input
              id={`${formId}-name`}
              name="name"
              value={draft.name}
              onChange={(event) => {
                updateDraft("name", event.currentTarget.value);
                clearError("name");
              }}
              aria-invalid={errors.name ? "true" : undefined}
              aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              autoComplete="off"
            />
            {errors.name ? (
              <span
                className="gbpr-field-error"
                id={`${formId}-name-error`}
                role="alert"
              >
                {errors.name}
              </span>
            ) : null}
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-price`}>Price</label>
            <div className="gbpr-input-affix">
              <span aria-hidden="true">£</span>
              <input
                id={`${formId}-price`}
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.price}
                onChange={(event) => {
                  updateDraft("price", event.currentTarget.value);
                  clearError("price");
                }}
                aria-invalid={errors.price ? "true" : undefined}
                aria-describedby={
                  errors.price ? `${formId}-price-error` : undefined
                }
              />
            </div>
            {errors.price ? (
              <span
                className="gbpr-field-error"
                id={`${formId}-price-error`}
                role="alert"
              >
                {errors.price}
              </span>
            ) : null}
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-vendor`}>Vendor</label>
            <select
              id={`${formId}-vendor`}
              name="vendor"
              value={draft.vendor}
              onChange={(event) => {
                updateDraft("vendor", event.currentTarget.value);
                clearError("vendor");
              }}
              aria-invalid={errors.vendor ? "true" : undefined}
              aria-describedby={
                errors.vendor ? `${formId}-vendor-error` : undefined
              }
            >
              <option value="">Choose vendor</option>
              {VENDORS.map((vendor) => (
                <option value={vendor} key={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
            {errors.vendor ? (
              <span
                className="gbpr-field-error"
                id={`${formId}-vendor-error`}
                role="alert"
              >
                {errors.vendor}
              </span>
            ) : null}
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-category`}>Category</label>
            <select
              id={`${formId}-category`}
              name="category"
              value={draft.category}
              onChange={(event) =>
                updateDraft("category", event.currentTarget.value)
              }
            >
              {CATEGORIES.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-size`}>Size / mg</label>
            <input
              id={`${formId}-size`}
              name="mgSize"
              value={draft.mgSize}
              onChange={(event) =>
                updateDraft("mgSize", event.currentTarget.value)
              }
              placeholder="e.g. 10 mg"
              autoComplete="off"
            />
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-stock`}>Stock</label>
            <input
              id={`${formId}-stock`}
              name="stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.stock}
              onChange={(event) => {
                updateDraft("stock", event.currentTarget.value);
                clearError("stock");
              }}
              placeholder="Unlimited"
              aria-invalid={errors.stock ? "true" : undefined}
              aria-describedby={
                errors.stock ? `${formId}-stock-error` : `${formId}-stock-hint`
              }
            />
            <span className="gbpr-field-hint" id={`${formId}-stock-hint`}>
              Leave blank for unlimited stock.
            </span>
            {errors.stock ? (
              <span
                className="gbpr-field-error"
                id={`${formId}-stock-error`}
                role="alert"
              >
                {errors.stock}
              </span>
            ) : null}
          </div>

          <div className="gbpr-field">
            <label htmlFor={`${formId}-maximum`}>Max per customer</label>
            <input
              id={`${formId}-maximum`}
              name="maxPerCustomer"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={draft.maxPerCustomer}
              onChange={(event) => {
                updateDraft("maxPerCustomer", event.currentTarget.value);
                clearError("maxPerCustomer");
              }}
              placeholder="No limit"
              aria-invalid={errors.maxPerCustomer ? "true" : undefined}
              aria-describedby={
                errors.maxPerCustomer
                  ? `${formId}-maximum-error`
                  : `${formId}-maximum-hint`
              }
            />
            <span className="gbpr-field-hint" id={`${formId}-maximum-hint`}>
              Leave blank when there is no purchase cap.
            </span>
            {errors.maxPerCustomer ? (
              <span
                className="gbpr-field-error"
                id={`${formId}-maximum-error`}
                role="alert"
              >
                {errors.maxPerCustomer}
              </span>
            ) : null}
          </div>

          <fieldset className="gbpr-toggle-group gbpr-field-span-2">
            <legend>Availability</legend>
            <label className="gbpr-toggle-row">
              <span>
                <strong>Visibility</strong>
                <small>Show this product to members in the group buy.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(event) =>
                  updateDraft("visible", event.currentTarget.checked)
                }
              />
            </label>
            <label className="gbpr-toggle-row">
              <span>
                <strong>Half kits</strong>
                <small>Allow members to reserve half of a standard kit.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.halfKitEnabled}
                onChange={(event) =>
                  updateDraft("halfKitEnabled", event.currentTarget.checked)
                }
              />
            </label>
          </fieldset>
        </div>

        <footer className="gbpr-form-footer">
          <div className="gbpr-form-danger-zone">
            {editing ? (
              <button
                type="button"
                className="gbpr-button"
                data-variant="danger-ghost"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 aria-hidden="true" />
                Delete product
              </button>
            ) : null}
            {deleteNotice ? <p role="status">{deleteNotice}</p> : null}
          </div>
          <div className="gbpr-form-actions">
            <button
              type="button"
              className="gbpr-button"
              data-variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gbpr-button"
              data-variant="primary"
            >
              {editing ? "Save changes" : "Add Product"}
            </button>
          </div>
        </footer>
      </form>

      <ConfirmAction
        open={deleteOpen}
        title="Delete product?"
        description="This is a mock preview. Confirming demonstrates the destructive flow without changing catalogue data."
        confirmLabel="Delete product"
        tone="danger"
        onConfirm={() => {
          setDeleteOpen(false);
          setDeleteNotice("Preview only — no product was deleted.");
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </section>
  );
}

export type ImportReviewProps = {
  rows: ImportReviewRow[];
  mode: "csv" | "ai";
  onToggle: (index: number) => void;
  onEdit: (
    index: number,
    patch: Partial<Pick<ImportReviewRow, "name" | "price" | "vendor" | "mgSize">>,
  ) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const STATUS_LABELS: Record<ImportReviewRow["status"], string> = {
  new: "New",
  duplicate: "Duplicate",
  "price-changed": "Price changed",
};

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function StatusBadge({
  status,
}: {
  status: ImportReviewRow["status"];
}) {
  return (
    <span className="gbpr-status" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ImportReview({
  rows,
  mode,
  onToggle,
  onEdit,
  onConfirm,
  onCancel,
}: ImportReviewProps) {
  const headingId = useId();
  const includedCount = rows.reduce(
    (count, row) => count + (row.included ? 1 : 0),
    0,
  );
  const heading = mode === "csv" ? "CSV Import" : "AI Price List";
  const guidance =
    mode === "csv"
      ? "Review the rows detected in your CSV before adding them to the catalogue."
      : "AI extracted these products from the price list. Check every field before confirming.";
  const HeadingIcon = mode === "csv" ? FileSpreadsheet : Sparkles;

  return (
    <section className="gbpr-import-review" aria-labelledby={headingId}>
      <header className="gbpr-import-header">
        <span className="gbpr-import-icon" aria-hidden="true">
          <HeadingIcon />
        </span>
        <div>
          <span className="gbpr-eyebrow">Import review</span>
          <h2 id={headingId}>{heading}</h2>
          <p>{guidance}</p>
        </div>
      </header>

      <div className="gbpr-table-wrap">
        <table className="gbpr-table gbpr-import-table">
          <caption className="gbpr-visually-hidden">
            Products detected for {heading}
          </caption>
          <thead>
            <tr>
              <th scope="col">Include</th>
              <th scope="col">Status</th>
              <th scope="col">Name</th>
              <th scope="col">Price</th>
              <th scope="col">Vendor</th>
              <th scope="col">Size / mg</th>
              <th scope="col">Existing price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowName = row.name || `row ${index + 1}`;
              return (
                <tr key={index} data-included={row.included}>
                  <td>
                    <label className="gbpr-import-toggle">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={() => onToggle(index)}
                        aria-label={`Include ${rowName}`}
                      />
                      <span>{row.included ? "Include" : "Skip"}</span>
                    </label>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <label className="gbpr-visually-hidden" htmlFor={`${headingId}-${index}-name`}>
                      Name for {rowName}
                    </label>
                    <input
                      id={`${headingId}-${index}-name`}
                      className="gbpr-table-input"
                      value={row.name}
                      onChange={(event) =>
                        onEdit(index, { name: event.currentTarget.value })
                      }
                    />
                  </td>
                  <td>
                    <label className="gbpr-visually-hidden" htmlFor={`${headingId}-${index}-price`}>
                      Price for {rowName}
                    </label>
                    <input
                      id={`${headingId}-${index}-price`}
                      className="gbpr-table-input gbpr-table-input-number"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price}
                      onChange={(event) => {
                        const nextPrice = event.currentTarget.valueAsNumber;
                        if (Number.isFinite(nextPrice)) {
                          onEdit(index, { price: nextPrice });
                        }
                      }}
                    />
                  </td>
                  <td>
                    <label className="gbpr-visually-hidden" htmlFor={`${headingId}-${index}-vendor`}>
                      Vendor for {rowName}
                    </label>
                    <input
                      id={`${headingId}-${index}-vendor`}
                      className="gbpr-table-input"
                      value={row.vendor}
                      onChange={(event) =>
                        onEdit(index, { vendor: event.currentTarget.value })
                      }
                    />
                  </td>
                  <td>
                    <label className="gbpr-visually-hidden" htmlFor={`${headingId}-${index}-size`}>
                      Size / mg for {rowName}
                    </label>
                    <input
                      id={`${headingId}-${index}-size`}
                      className="gbpr-table-input gbpr-table-input-size"
                      value={row.mgSize}
                      onChange={(event) =>
                        onEdit(index, { mgSize: event.currentTarget.value })
                      }
                    />
                  </td>
                  <td>
                    {row.existingPrice !== undefined ? (
                      <span className="gbpr-price-comparison">
                        <span>{MONEY.format(row.existingPrice)}</span>
                        {row.status === "price-changed" ? (
                          <strong>→ {MONEY.format(row.price)}</strong>
                        ) : null}
                      </span>
                    ) : (
                      <span className="gbpr-table-muted">Not in catalogue</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="gbpr-import-footer">
        <p aria-live="polite">
          <strong>{includedCount}</strong> of {rows.length} products selected
        </p>
        <div>
          <button
            type="button"
            className="gbpr-button"
            data-variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="gbpr-button"
            data-variant="primary"
            onClick={onConfirm}
            disabled={includedCount === 0}
          >
            Confirm {includedCount} {includedCount === 1 ? "product" : "products"}
          </button>
        </div>
      </footer>
    </section>
  );
}

export type ConfirmActionProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmAction({
  open,
  title,
  description,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: ConfirmActionProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancelRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  function handleOverlayClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  if (!open) return null;

  return (
    <div
      className="gbpr-modal-layer"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <section
        className="gbpr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-tone={tone}
      >
        <button
          ref={closeRef}
          type="button"
          className="gbpr-modal-close"
          aria-label="Close confirmation"
          onClick={onCancel}
        >
          <X aria-hidden="true" />
        </button>
        <div className="gbpr-modal-symbol" aria-hidden="true">
          {tone === "danger" ? <Trash2 /> : <RotateCcw />}
        </div>
        <div className="gbpr-modal-copy">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <footer className="gbpr-modal-actions">
          <button
            type="button"
            className="gbpr-button"
            data-variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="gbpr-button"
            data-variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

export type MockFeedbackProps = {
  message: string;
  onUndo: () => void;
  onDismiss?: () => void;
};

export function MockFeedback({
  message,
  onUndo,
  onDismiss,
}: MockFeedbackProps) {
  return (
    <div className="gbpr-feedback" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
      {onDismiss ? (
        <button
          type="button"
          className="gbpr-feedback-dismiss"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
