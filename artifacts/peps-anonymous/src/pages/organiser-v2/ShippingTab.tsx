import { useState } from "react";
import { V2_CARD_BORDER } from "./theme";
import {
  Truck, Plus, Loader2, Trash2, Save, Check, X, DollarSign,
  Package, ChevronDown, ChevronRight, Lightbulb, CheckCircle2
} from "lucide-react";

// ─── Workspace: Shipping Tab ─────────────────────────────────────────────────
// Manage shipping options, payment methods, and vendor shipping costs

interface ShippingOption {
  id: string;
  label: string;
  description: string;
  price: string;
  requiresAddress: boolean;
  requiresQrCode: boolean;
}

interface ShippingTabProps {
  selectedGbId?: string;
}

const SAMPLE_SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "1",
    label: "Standard Shipping",
    description: "5-7 business days delivery",
    price: "5.00",
    requiresAddress: true,
    requiresQrCode: false,
  },
  {
    id: "2",
    label: "Express Delivery",
    description: "Next day delivery",
    price: "15.00",
    requiresAddress: true,
    requiresQrCode: false,
  },
  {
    id: "3",
    label: "InPost Locker",
    description: "Pick up from InPost parcel locker",
    price: "3.00",
    requiresAddress: false,
    requiresQrCode: true,
  },
];

export default function ShippingTab({ selectedGbId }: ShippingTabProps = {}) {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(SAMPLE_SHIPPING_OPTIONS);
  const [expandedSection, setExpandedSection] = useState<string | null>("shipping-options");
  const [savingShipping, setSavingShipping] = useState(false);
  const [savedShipping, setSavedShipping] = useState(false);

  // Vendor shipping
  const [vendorShipCost, setVendorShipCost] = useState("120.00");
  const [vendorShipKits, setVendorShipKits] = useState("20");
  const [savingVendor, setSavingVendor] = useState(false);
  const [savedVendor, setSavedVendor] = useState(false);

  // Shipping split
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitTotal, setSplitTotal] = useState("150.00");
  const [splitEqualPct, setSplitEqualPct] = useState(50);
  const [splitWeightedPct, setSplitWeightedPct] = useState(50);

  const currency = "GBP";

  const addShippingOption = () => {
    setShippingOptions([
      ...shippingOptions,
      {
        id: Date.now().toString(),
        label: "",
        description: "",
        price: "0.00",
        requiresAddress: true,
        requiresQrCode: false,
      },
    ]);
  };

  const updateShippingOption = (index: number, field: keyof ShippingOption, value: any) => {
    setShippingOptions(prev =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const removeShippingOption = (index: number) => {
    setShippingOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveShipping = async () => {
    setSavingShipping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSavingShipping(false);
    setSavedShipping(true);
    setTimeout(() => setSavedShipping(false), 2000);
  };

  const handleSaveVendor = async () => {
    setSavingVendor(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSavingVendor(false);
    setSavedVendor(true);
    setTimeout(() => setSavedVendor(false), 2000);
  };

  const syncSplitSlider = (field: "equal" | "weighted", value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    if (field === "equal") {
      setSplitEqualPct(clamped);
      setSplitWeightedPct(100 - clamped);
    } else {
      setSplitWeightedPct(clamped);
      setSplitEqualPct(100 - clamped);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to manage shipping options
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Shipping</h2>
        <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Configure shipping options, payment methods, and vendor shipping costs
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ border: "1px solid var(--t-blue-20)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-blue)", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How Shipping Works</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              Set up the delivery options your customers can choose at checkout. Each option has a price that's added to their order total. You can also track your vendor shipping costs and split them across orders.
            </p>
          </div>
        </div>
      </div>

      {/* White Container */}
      <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>

        {/* Shipping Options Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => toggleSection("shipping-options")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "shipping-options" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Shipping Options
              </span>
            </div>
            {expandedSection === "shipping-options" ? (
              <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
            )}
          </button>

          {expandedSection === "shipping-options" && (
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>What customers see:</strong> These are the delivery methods shown at checkout. Each option has a name (e.g., "Express Delivery"), price, and optional description. The price is added to their order total.
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Address & Labels:</strong> Check "Requires delivery address" for shipped items. Check "Requires QR code or postage label upload" for services like InPost lockers or Royal Mail Click & Drop where customers need to upload proof.
                </p>
              </div>

              {shippingOptions.map((option, index) => (
                <div key={option.id} className="p-3 rounded-lg space-y-2" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "var(--t-surface2)" }}>
                  <div className="flex items-center gap-2">
                    <input
                      value={option.label}
                      onChange={(e) => updateShippingOption(index, "label", e.target.value)}
                      placeholder="e.g. Standard Shipping"
                      className="flex-1 h-9 px-3 rounded-lg text-[14px] font-semibold outline-none"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    />
                    <div className="flex items-center gap-1 px-2.5 h-9 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
                      <span className="text-[13px] font-semibold shrink-0" style={{ color: "var(--t-subtle)" }}>{currency}</span>
                      <input
                        value={option.price}
                        onChange={(e) => updateShippingOption(index, "price", e.target.value)}
                        placeholder="0.00"
                        className="w-20 bg-transparent text-[14px] outline-none text-right"
                        style={{ color: "var(--t-text)" }}
                      />
                    </div>
                    <button
                      onClick={() => removeShippingOption(index)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-50"
                      style={{ color: "#DC2626" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    value={option.description}
                    onChange={(e) => updateShippingOption(index, "description", e.target.value)}
                    placeholder="Description (optional) — shown to members at checkout"
                    className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: "var(--t-subtle)" }}>
                      <input
                        type="checkbox"
                        checked={option.requiresAddress}
                        onChange={(e) => updateShippingOption(index, "requiresAddress", e.target.checked)}
                        className="rounded"
                      />
                      Requires delivery address
                    </label>
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: "var(--t-subtle)" }}>
                      <input
                        type="checkbox"
                        checked={option.requiresQrCode}
                        onChange={(e) => updateShippingOption(index, "requiresQrCode", e.target.checked)}
                        className="rounded"
                      />
                      Requires QR code or postage label upload
                    </label>
                  </div>
                </div>
              ))}

              <button
                onClick={addShippingOption}
                className="w-full h-10 rounded-lg flex items-center justify-center gap-2 hover:bg-black/5"
                style={{ border: `2px dashed ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-[13px] font-semibold">Add Shipping Option</span>
              </button>

              <button
                onClick={handleSaveShipping}
                disabled={savingShipping}
                className="h-10 px-5 rounded-lg text-[14px] font-bold text-white flex items-center gap-2"
                style={{ background: savedShipping ? "#16A34A" : "var(--t-blue)" }}
              >
                {savingShipping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedShipping ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {savingShipping ? "Saving..." : savedShipping ? "Saved!" : "Save Shipping Options"}
              </button>
            </div>
          )}
        </div>

        {/* Vendor Shipping Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => toggleSection("vendor-shipping")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "vendor-shipping" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Vendor Shipping
              </span>
            </div>
            {expandedSection === "vendor-shipping" ? (
              <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
            )}
          </button>

          {expandedSection === "vendor-shipping" && (
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Your costs, not customer-facing:</strong> Track how much you're paying your vendor to ship products to you or your reshipper. This is for your records and profit calculations — customers never see this.
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Example:</strong> If your vendor charges $120 to ship 20 kits from China to your warehouse, enter those numbers here to track your actual shipping costs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Shipping Cost
                  </label>
                  <div className="flex items-center gap-1 px-3 h-10 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
                    <DollarSign className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={vendorShipCost}
                      onChange={(e) => setVendorShipCost(e.target.value)}
                      placeholder="e.g. 120.00"
                      className="flex-1 bg-transparent text-[14px] outline-none"
                      style={{ color: "var(--t-text)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Packages / Kits
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={vendorShipKits}
                    onChange={(e) => setVendorShipKits(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full h-10 px-3 rounded-lg text-[14px] outline-none"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveVendor}
                disabled={savingVendor}
                className="h-10 px-5 rounded-lg text-[14px] font-bold text-white flex items-center gap-2"
                style={{ background: savedVendor ? "#16A34A" : "var(--t-blue)" }}
              >
                {savingVendor ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedVendor ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingVendor ? "Saving..." : savedVendor ? "Saved!" : "Save Vendor Shipping"}
              </button>
            </div>
          )}
        </div>

        {/* Shipping Split Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div
            role="button"
            tabIndex={0}
            aria-expanded={expandedSection === "shipping-split"}
            aria-controls="shipping-split-panel"
            onClick={() => toggleSection("shipping-split")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleSection("shipping-split");
              }
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors cursor-pointer"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "shipping-split" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Shipping Split
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={splitEnabled}
                aria-label="Toggle shipping cost split"
                onClick={(e) => {
                  e.stopPropagation();
                  setSplitEnabled(!splitEnabled);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className="w-11 h-6 rounded-full transition-all relative"
                style={{ background: splitEnabled ? "var(--t-blue)" : "var(--t-border)" }}
              >
                <div
                  className="absolute w-4 h-4 bg-white rounded-full top-1 transition-all"
                  style={{ left: splitEnabled ? "calc(100% - 20px)" : "4px" }}
                />
              </button>
              {expandedSection === "shipping-split" ? (
                <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
              ) : (
                <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
              )}
            </div>
          </div>

          {expandedSection === "shipping-split" && (
            <div id="shipping-split-panel" className="p-4 space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Split vendor costs fairly:</strong> Instead of you absorbing the entire vendor shipping cost, split it across all orders in this group buy. The system adds a calculated amount to each order's total.
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Equal vs Weighted:</strong> "Equal" means every order pays the same amount. "Quantity-weighted" means larger orders (more items) pay proportionally more. Use the sliders to balance between the two approaches.
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Example:</strong> If vendor shipping is $150 and you have 10 orders, 100% equal split = $15 per order. With 50/50 split and varying order sizes, smaller orders pay less, larger orders pay more.
                </p>
                <p className="text-[13px] leading-relaxed mt-2" style={{ color: "var(--t-muted)" }}>
                  <strong style={{ color: "var(--t-text)" }}>Note:</strong> If you use reshippers or country legs, each reshipper/leg can have their own shipping split configured separately.
                </p>
              </div>

              {splitEnabled && (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
                      Total Vendor Shipping Cost
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={splitTotal}
                      onChange={(e) => setSplitTotal(e.target.value)}
                      placeholder="e.g. 150.00"
                      className="w-full h-10 px-3 rounded-lg text-[14px] outline-none"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Equal portion</p>
                          <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>Same amount per order</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={splitEqualPct}
                            onChange={(e) => syncSplitSlider("equal", parseFloat(e.target.value) || 0)}
                            className="w-16 text-center text-[14px] h-9 px-2 rounded-lg outline-none"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                          />
                          <span className="text-[13px]" style={{ color: "var(--t-subtle)" }}>%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitEqualPct}
                        onChange={(e) => syncSplitSlider("equal", parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, var(--t-blue) 0%, var(--t-blue) ${splitEqualPct}%, var(--t-border) ${splitEqualPct}%, var(--t-border) 100%)` }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Quantity-weighted</p>
                          <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>More items = more shipping</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={splitWeightedPct}
                            onChange={(e) => syncSplitSlider("weighted", parseFloat(e.target.value) || 0)}
                            className="w-16 text-center text-[14px] h-9 px-2 rounded-lg outline-none"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                          />
                          <span className="text-[13px]" style={{ color: "var(--t-subtle)" }}>%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitWeightedPct}
                        onChange={(e) => syncSplitSlider("weighted", parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, var(--t-blue) 0%, var(--t-blue) ${splitWeightedPct}%, var(--t-border) ${splitWeightedPct}%, var(--t-border) 100%)` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
