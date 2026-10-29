import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import "./_group.css";
import "./VendorFirst.css";

type Vendor = { id: string; name: string; descriptor: string; isDemo?: boolean };
type Product = {
  id: string;
  vendorId: string;
  name: string;
  category: string;
  format: string;
  price: number;
};

const vendors: Vendor[] = [
  { id: "uther", name: "Uther", descriptor: "Wholesale supplier" },
  { id: "supplier-demo", name: "Second supplier", descriptor: "Example supplier", isDemo: true },
];

const products: Product[] = [
  { id: "u-01", vendorId: "uther", name: "BPC-157", category: "Peptides", format: "5 mg · kit", price: 31.5 },
  { id: "u-02", vendorId: "uther", name: "TB-500", category: "Peptides", format: "5 mg · kit", price: 38 },
  { id: "u-03", vendorId: "uther", name: "CJC-1295 / Ipamorelin", category: "Peptides", format: "10 mg · kit", price: 46.25 },
  { id: "u-04", vendorId: "uther", name: "NAD+", category: "Research compounds", format: "500 mg · kit", price: 42 },
  { id: "u-05", vendorId: "uther", name: "Retatrutide", category: "Peptides", format: "10 mg · kit", price: 57.75 },
  { id: "u-06", vendorId: "uther", name: "GHK-Cu", category: "Peptides", format: "50 mg · kit", price: 29 },
  { id: "d-01", vendorId: "supplier-demo", name: "Example peptide A", category: "Peptides", format: "5 mg · kit", price: 34.5 },
  { id: "d-02", vendorId: "supplier-demo", name: "Example peptide B", category: "Peptides", format: "10 mg · kit", price: 49 },
  { id: "d-03", vendorId: "supplier-demo", name: "Example research compound", category: "Research compounds", format: "500 mg · kit", price: 44 },
];

type Delivery = {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
};

const initialDelivery: Delivery = {
  fullName: "Alex Morgan",
  phone: "+44 7700 900 312",
  email: "alex.morgan@example.org",
  line1: "18 Bell Street",
  line2: "Flat 2",
  city: "London",
  postcode: "NW1 6SP",
  country: "United Kingdom",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export function VendorFirst() {
  const [step, setStep] = useState(0);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [pendingVendorId, setPendingVendorId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [delivery, setDelivery] = useState<Delivery>(initialDelivery);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const vendor = vendors.find((item) => item.id === vendorId);
  const vendorProducts = useMemo(
    () => products.filter((product) => product.vendorId === vendorId),
    [vendorId],
  );
  const visibleProducts = useMemo(
    () => vendorProducts.filter((product) =>
      `${product.name} ${product.category} ${product.format}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [vendorProducts, query],
  );
  const selected = vendorProducts.filter((product) => (quantities[product.id] ?? 0) > 0);
  const itemCount = selected.reduce((total, product) => total + (quantities[product.id] ?? 0), 0);
  const subtotal = selected.reduce(
    (total, product) => total + product.price * (quantities[product.id] ?? 0),
    0,
  );
  const shipping = itemCount > 0 ? (itemCount <= 5 ? 12.5 : 18.75) : 0;
  const credits = 0;
  const total = subtotal + shipping - credits;

  const changeQuantity = (id: string, amount: number) => {
    setQuantities((current) => {
      const next = { ...current };
      const updated = (next[id] ?? 0) + amount;
      if (updated <= 0) delete next[id];
      else next[id] = updated;
      return next;
    });
  };

  const requestVendor = (nextId: string) => {
    if (nextId === vendorId) return;
    if (itemCount > 0) {
      setPendingVendorId(nextId);
      return;
    }
    setVendorId(nextId);
    setQuery("");
    setStep(1);
  };

  const confirmVendorChange = () => {
    if (!pendingVendorId) return;
    setQuantities({});
    setVendorId(pendingVendorId);
    setPendingVendorId(null);
    setQuery("");
    setStep(1);
  };

  const startDelivery = () => {
    if (itemCount < 1) return;
    setStep(2);
    setEditingDelivery(false);
    setDeliveryError("");
  };

  const saveDelivery = () => {
    const required: (keyof Delivery)[] = ["fullName", "phone", "line1", "city", "postcode", "country"];
    if (required.some((key) => !delivery[key].trim())) {
      setDeliveryError("Please complete each required delivery field.");
      return;
    }
    setDeliveryError("");
    setEditingDelivery(false);
  };

  const stepLabels = ["Supplier", "Products", "Delivery", "Review"];

  return (
    <main className="vf-root">
      <div className="vf-topline">
        <div className="vf-brand" aria-label="Peps Anonymous">
          <span>Peps Anonymous</span>
        </div>
        <div className="vf-top-meta">
          <span className="vf-member"><ShieldCheck size={15} /> Member wholesale</span>
          <span className="vf-demo-tag">DEMO PREVIEW</span>
        </div>
      </div>

      <div className="vf-page">
        <header className="vf-heading">
          <div>
            <p className="vf-eyebrow">MEMBER ORDERING</p>
            <h1>Wholesale order</h1>
            <p className="vf-subtitle">Choose a supplier first. Every item and shipping charge below belongs to that supplier.</p>
          </div>
          <div className="vf-order-ref"><span className="vf-ref-dot" /> Draft order <span className="vf-ref-sep">/</span> Not submitted</div>
        </header>

        <nav className="vf-steps" aria-label="Order steps">
          {stepLabels.map((label, index) => {
            const complete = index < step;
            const active = index === step;
            return (
              <button
                type="button"
                key={label}
                className={`vf-step ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}
                onClick={() => {
                  if (index < step) {
                    setStep(index);
                    if (index !== 2) setEditingDelivery(false);
                  }
                }}
                aria-current={active ? "step" : undefined}
                disabled={index > step}
              >
                <span className="vf-step-number">{complete ? <Check size={13} /> : `0${index + 1}`}</span>
                <span>{label}</span>
                {index < stepLabels.length - 1 && <span className="vf-step-line" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <div className="vf-layout">
          <section className="vf-main-column">
            {step === 0 && (
              <section className="vf-panel vf-vendor-panel" aria-labelledby="supplier-heading">
                <div className="vf-section-intro">
                  <div className="vf-section-icon"><Package size={19} /></div>
                  <div>
                    <p className="vf-kicker">STEP 01 · OWNERSHIP FIRST</p>
                    <h2 id="supplier-heading">Choose your supplier</h2>
                    <p>One supplier per regular wholesale order. Catalogue, prices and parcel shipping stay together.</p>
                  </div>
                </div>
                <div className="vf-vendor-list">
                  {vendors.map((item, index) => {
                    const active = vendorId === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`vf-vendor-choice ${active ? "selected" : ""}`}
                        onClick={() => requestVendor(item.id)}
                        aria-pressed={active}
                      >
                        <span className={`vf-vendor-monogram ${index === 0 ? "uther" : "example"}`}>{index === 0 ? "U" : "S"}</span>
                        <span className="vf-vendor-copy">
                          <span className="vf-vendor-name">{item.name}</span>
                          <span className="vf-vendor-desc">{item.descriptor}{item.isDemo ? " · demo name" : ""}</span>
                        </span>
                        {item.isDemo && <span className="vf-example-pill">Example only</span>}
                        <span className="vf-vendor-arrow">{active ? <Check size={18} /> : <ChevronRight size={18} />}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="vf-note">
                  <CircleHelp size={16} />
                  <span>Shared orders are a separate flow and may include parcels from multiple suppliers. This regular order is single-supplier.</span>
                </div>
                {vendor && (
                  <div className="vf-panel-footer">
                    <span className="vf-selection-note"><Check size={15} /> {vendor.name} selected</span>
                    <button className="vf-button primary" type="button" onClick={() => setStep(1)}>
                      Browse {vendor.name} products <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                {!vendor && <p className="vf-prompt">Select a supplier to continue.</p>}
              </section>
            )}

            {step === 1 && (
              <section className="vf-panel" aria-labelledby="products-heading">
                <div className="vf-step-header">
                  <div>
                    <p className="vf-kicker">STEP 02 · {vendor?.name.toUpperCase()} CATALOGUE</p>
                    <h2 id="products-heading">Choose products</h2>
                    <p>Quantities are ordered as kits. Prices shown are sample demo prices.</p>
                  </div>
                  <button className="vf-text-button" type="button" onClick={() => setStep(0)}><ArrowLeft size={15} /> Change supplier</button>
                </div>
                <label className="vf-search">
                  <Search size={17} />
                  <span className="vf-sr-only">Search products</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this supplier’s catalogue" />
                  {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>Clear</button>}
                </label>
                <div className="vf-product-list">
                  {visibleProducts.map((product) => {
                    const quantity = quantities[product.id] ?? 0;
                    return (
                      <article className="vf-product-row" key={product.id}>
                        <div className="vf-product-stamp" aria-hidden="true">{product.category === "Peptides" ? "P" : "R"}</div>
                        <div className="vf-product-copy">
                          <div className="vf-product-category">{product.category}</div>
                          <h3>{product.name}</h3>
                          <p>{product.format}</p>
                        </div>
                        <div className="vf-product-action">
                          <span className="vf-product-price">{money(product.price)} <small>/ kit</small></span>
                          {quantity === 0 ? (
                            <button className="vf-add-button" type="button" onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one kit of ${product.name}`}>
                              <Plus size={15} /> Add
                            </button>
                          ) : (
                            <div className="vf-quantity" aria-label={`${quantity} kits of ${product.name}`}>
                              <button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one kit of ${product.name}`}><Minus size={14} /></button>
                              <span>{quantity}</span>
                              <button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one kit of ${product.name}`}><Plus size={14} /></button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {visibleProducts.length === 0 && (
                    <div className="vf-empty">
                      <Search size={21} />
                      <strong>No matching products</strong>
                      <span>Try a different search term in the {vendor?.name} catalogue.</span>
                    </div>
                  )}
                </div>
                <div className="vf-product-footer">
                  <button className="vf-button secondary" type="button" onClick={() => setStep(0)}><ArrowLeft size={16} /> Supplier</button>
                  <div className="vf-footer-right">
                    <span className="vf-inline-total">{itemCount} {itemCount === 1 ? "kit" : "kits"} <b>{money(subtotal)}</b></span>
                    <button className="vf-button primary" type="button" disabled={itemCount === 0} onClick={startDelivery}>
                      Delivery details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="vf-panel" aria-labelledby="delivery-heading">
                <div className="vf-step-header">
                  <div>
                    <p className="vf-kicker">STEP 03 · DELIVERY</p>
                    <h2 id="delivery-heading">Where should this parcel go?</h2>
                    <p>Saved details are shown for this mockup. Edit anything that needs updating.</p>
                  </div>
                  <button className="vf-text-button" type="button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Edit products</button>
                </div>

                {!editingDelivery ? (
                  <>
                    <div className="vf-address-card">
                      <div className="vf-address-pin"><MapPin size={18} /></div>
                      <div className="vf-address-info">
                        <div className="vf-address-title">{delivery.fullName || "Delivery address"}</div>
                        <p>{[delivery.line1, delivery.line2, delivery.city, delivery.postcode, delivery.country].filter(Boolean).join(", ")}</p>
                        <div className="vf-contact-lines">
                          {delivery.phone && <span>{delivery.phone}</span>}
                          {delivery.email && <span>{delivery.email}</span>}
                        </div>
                      </div>
                      <button type="button" className="vf-edit-link" onClick={() => setEditingDelivery(true)}>Edit details</button>
                    </div>
                    <div className="vf-delivery-info"><Truck size={17} /><span>Shipping is estimated for this demo and will be shown separately in the review.</span></div>
                    <div className="vf-panel-footer">
                      <button className="vf-button secondary" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Products</button>
                      <button className="vf-button primary" type="button" onClick={() => setStep(3)}>Review order <ArrowRight size={16} /></button>
                    </div>
                  </>
                ) : (
                  <form className="vf-address-form" onSubmit={(event) => { event.preventDefault(); saveDelivery(); }}>
                    <div className="vf-form-grid">
                      <label className="vf-field wide"><span>Full name <b>*</b></span><input value={delivery.fullName} onChange={(event) => setDelivery({ ...delivery, fullName: event.target.value })} /></label>
                      <label className="vf-field"><span>Phone <b>*</b></span><input value={delivery.phone} onChange={(event) => setDelivery({ ...delivery, phone: event.target.value })} /></label>
                      <label className="vf-field"><span>Email</span><input type="email" value={delivery.email} onChange={(event) => setDelivery({ ...delivery, email: event.target.value })} /></label>
                      <label className="vf-field wide"><span>Address line 1 <b>*</b></span><input value={delivery.line1} onChange={(event) => setDelivery({ ...delivery, line1: event.target.value })} /></label>
                      <label className="vf-field wide"><span>Address line 2</span><input value={delivery.line2} onChange={(event) => setDelivery({ ...delivery, line2: event.target.value })} /></label>
                      <label className="vf-field"><span>City <b>*</b></span><input value={delivery.city} onChange={(event) => setDelivery({ ...delivery, city: event.target.value })} /></label>
                      <label className="vf-field"><span>Postcode <b>*</b></span><input value={delivery.postcode} onChange={(event) => setDelivery({ ...delivery, postcode: event.target.value })} /></label>
                      <label className="vf-field wide"><span>Country <b>*</b></span><input value={delivery.country} onChange={(event) => setDelivery({ ...delivery, country: event.target.value })} /></label>
                    </div>
                    {deliveryError && <p className="vf-form-error" role="alert">{deliveryError}</p>}
                    <div className="vf-panel-footer">
                      <button className="vf-button secondary" type="button" onClick={() => { setEditingDelivery(false); setDeliveryError(""); }}>Cancel edit</button>
                      <button className="vf-button primary" type="submit"><Check size={16} /> Save address</button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="vf-panel vf-review-panel" aria-labelledby="review-heading">
                <div className="vf-step-header">
                  <div>
                    <p className="vf-kicker">STEP 04 · FINAL CHECK</p>
                    <h2 id="review-heading">Review your order</h2>
                    <p>One supplier. One parcel estimate. Check each total before you leave this preview.</p>
                  </div>
                  <span className="vf-review-mark"><Check size={17} /> Ready to review</span>
                </div>
                <div className="vf-review-vendor">
                  <span className="vf-mini-monogram">{vendor?.name === "Uther" ? "U" : "S"}</span>
                  <div><span className="vf-kicker">SUPPLIER</span><strong>{vendor?.name}{vendor?.isDemo ? " (demo)" : ""}</strong></div>
                  <button type="button" className="vf-edit-link" onClick={() => setStep(0)}>Edit supplier</button>
                </div>
                <div className="vf-review-block">
                  <div className="vf-review-heading"><span>Products</span><button type="button" onClick={() => setStep(1)}>Edit items</button></div>
                  {selected.map((product) => (
                    <div className="vf-review-item" key={product.id}>
                      <span className="vf-review-qty">{quantities[product.id]}×</span>
                      <span className="vf-review-name">{product.name}<small>{product.format}</small></span>
                      <span className="vf-review-line">{money(product.price * quantities[product.id])}</span>
                    </div>
                  ))}
                  <div className="vf-money-row"><span>Products subtotal</span><strong>{money(subtotal)}</strong></div>
                </div>
                <div className="vf-review-block vf-cost-block">
                  <div className="vf-review-heading"><span>Supplier shipping</span></div>
                  <div className="vf-shipping-line"><span className="vf-shipping-icon"><Truck size={17} /></span><span><strong>{vendor?.name} parcel estimate</strong><small>Sample shipping price · not a quote or guarantee</small></span><b>{money(shipping)}</b></div>
                  <div className="vf-money-row credit-row"><span>Credits</span><strong>−{money(credits)}</strong></div>
                </div>
                <div className="vf-review-block vf-review-address">
                  <div className="vf-review-heading"><span>Delivery details</span><button type="button" onClick={() => { setStep(2); setEditingDelivery(true); }}>Edit address</button></div>
                  <p><strong>{delivery.fullName}</strong> · {[delivery.line1, delivery.line2, delivery.city, delivery.postcode, delivery.country].filter(Boolean).join(", ")}</p>
                </div>
                <div className="vf-grand-total"><span>Total <small>Products + shipping − credits</small></span><strong>{money(total)}</strong></div>
                <div className="vf-demo-disclaimer"><ShieldCheck size={16} /><span>This is a local mockup only. No order is submitted, no payment is taken, and these sample prices and shipping figures are not live quotes.</span></div>
                <div className="vf-panel-footer">
                  <button className="vf-button secondary" type="button" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back to delivery</button>
                  <button className="vf-button primary" type="button" onClick={() => setStep(1)}>Edit order <ShoppingBag size={16} /></button>
                </div>
              </section>
            )}
          </section>

          <aside className="vf-summary">
            <div className="vf-summary-top">
              <div className="vf-summary-title"><span className="vf-summary-bag"><ShoppingBag size={17} /></span><h2>Order summary</h2></div>
              <span className="vf-summary-count">{itemCount} {itemCount === 1 ? "kit" : "kits"}</span>
            </div>
            <div className="vf-summary-vendor">
              <span className="vf-summary-label">SUPPLIER</span>
              {vendor ? <strong>{vendor.name}{vendor.isDemo ? <em> demo</em> : ""}</strong> : <span className="vf-choose-vendor">Choose a supplier first</span>}
            </div>
            {selected.length ? (
              <div className="vf-summary-items">
                {selected.map((product) => (
                  <div className="vf-summary-item" key={product.id}>
                    <span><b>{quantities[product.id]}×</b> {product.name}</span>
                    <strong>{money(product.price * quantities[product.id])}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vf-summary-empty"><ShoppingBag size={18} /><span>Your selected products will appear here.</span></div>
            )}
            <div className="vf-summary-totals">
              <div><span>Products subtotal</span><strong>{money(subtotal)}</strong></div>
              <div><span>Shipping <small>{vendor ? `· ${vendor.name}` : ""}</small></span><strong>{money(shipping)}</strong></div>
              <div><span>Credits</span><strong>−{money(credits)}</strong></div>
            </div>
            <div className="vf-summary-grand"><span>Estimated total</span><strong>{money(total)}</strong></div>
            <p className="vf-summary-caption">Sample figures · shown for clarity, not a live quote.</p>
            {vendor && step > 0 && (
              <button
                type="button"
                className="vf-summary-edit"
                onClick={() => setStep(step === 3 ? 1 : Math.min(step + 1, 3))}
              >
                {step === 3 ? "Continue editing products" : step === 1 ? "Continue to delivery" : "Continue to review"}
                <ArrowRight size={15} />
              </button>
            )}
          </aside>
        </div>
        <footer className="vf-footer"><span>Peps Anonymous · Member wholesale preview</span><span>Sample data only</span></footer>
      </div>

      {pendingVendorId && (
        <div className="vf-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingVendorId(null); }}>
          <section className="vf-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="switch-heading" aria-describedby="switch-copy">
            <span className="vf-warning-icon"><CircleHelp size={22} /></span>
            <p className="vf-kicker">SUPPLIER CHANGE</p>
            <h2 id="switch-heading">Clear basket and switch?</h2>
            <p id="switch-copy">Your current {vendor?.name} items cannot move to {vendors.find((item) => item.id === pendingVendorId)?.name}. Switching suppliers will clear all {itemCount} {itemCount === 1 ? "kit" : "kits"} in this basket.</p>
            <div className="vf-dialog-actions">
              <button className="vf-button secondary" type="button" onClick={() => setPendingVendorId(null)}>Keep {vendor?.name}</button>
              <button className="vf-button danger" type="button" onClick={confirmVendorChange}>Clear basket &amp; switch</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
