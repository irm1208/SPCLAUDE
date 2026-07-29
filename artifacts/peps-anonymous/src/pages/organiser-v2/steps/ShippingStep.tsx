import { useState } from "react";
import { Plus, Trash2, Truck, MapPin, QrCode as QrCodeIcon } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Shipping Step ────────────────────────────────────────────────────
// Configure shipping options for the group buy. Each option has a label, price,
// optional description, and toggles for requiring address/QR code.

interface ShippingOption {
  id: string;
  label: string;
  price: string;
  description: string;
  region: string;
  requiresAddress: boolean;
  requiresQr: boolean;
}

export default function ShippingStep() {
  const [options, setOptions] = useState<ShippingOption[]>([
    { id: "1", label: "", price: "", description: "", region: "UK", requiresAddress: true, requiresQr: false },
  ]);
  useRegisterSetupSection("shipping", { options });

  const removeOption = (id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const addOption = () => {
    const newId = String(Date.now());
    setOptions(prev => [...prev, { id: newId, label: "", price: "", description: "", region: "UK", requiresAddress: true, requiresQr: false }]);
  };

  const updateOption = (id: string, field: keyof ShippingOption, value: any) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-blue)" }}>
          Set up shipping options for different regions. Members will choose one when ordering. You can offer multiple options (e.g. tracked, express, locker pickup) at different prices.
        </p>
      </div>

      {/* Shipping options list */}
      {options.length > 0 ? (
        <div className="space-y-3">
          {options.map((opt, index) => (
            <div key={opt.id} className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
              {/* Header with title and delete */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                  <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>
                    {opt.label || `Shipping Option ${index + 1}`}
                  </span>
                  {opt.region && (
                    <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                      {opt.region}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeOption(opt.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-red-50"
                  style={{ color: "#EF4444" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-semibold">Remove</span>
                </button>
              </div>

              {/* Form fields */}
              <div className="p-4 space-y-3">
              {/* Label, Region & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px] gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Shipping Option Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Standard Shipping"
                    value={opt.label}
                    onChange={(e) => updateOption(opt.id, "label", e.target.value)}
                    className="w-full h-9 px-3 rounded-md text-[14px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Region / Country
                  </label>
                  <select
                    value={opt.region}
                    onChange={(e) => updateOption(opt.id, "region", e.target.value)}
                    className="w-full h-9 px-3 rounded-md text-[14px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  >
                    <option value="UK">UK</option>
                    <option value="EU">EU</option>
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Asia">Asia</option>
                    <option value="Worldwide">Worldwide</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                    Price
                  </label>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={opt.price}
                    onChange={(e) => updateOption(opt.id, "price", e.target.value)}
                    className="w-full h-9 px-3 rounded-md text-[14px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivery in 5-7 days"
                  value={opt.description}
                  onChange={(e) => updateOption(opt.id, "description", e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.requiresAddress}
                    onChange={(e) => updateOption(opt.id, "requiresAddress", e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--t-blue)" }}
                  />
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  <span className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>
                    Requires shipping address
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.requiresQr}
                    onChange={(e) => updateOption(opt.id, "requiresQr", e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--t-blue)" }}
                  />
                  <QrCodeIcon className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  <span className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>
                    Requires postage label or QR code upload
                  </span>
                </label>
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg p-8 text-center bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
            <Truck className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
          </div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>No shipping options yet</p>
          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>Add your first shipping method</p>
        </div>
      )}

      {/* Add option button */}
      <button
        onClick={addOption}
        className="w-full h-10 rounded-lg text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
        style={{ border: `2px dashed ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
      >
        <Plus className="w-4 h-4" /> Add Shipping Option
      </button>

      {/* Helper text */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px]" style={{ color: "var(--t-blue)" }}>
          <strong>Tip:</strong> Match shipping options to your regions. For example, InPost lockers in Poland might require a QR code, while UK Royal Mail needs a full address.
        </p>
      </div>
    </div>
  );
}
