import { useState } from "react";
import { Calendar } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Basics Step ──────────────────────────────────────────────────────
// The first wizard step — core GB info: name, description, currency, close date,
// and supplier details.

export default function BasicsStep() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [closeDate, setCloseDate] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [manufacturerCountry, setManufacturerCountry] = useState("");
  const [labTestSupplier, setLabTestSupplier] = useState("");
  useRegisterSetupSection("basics", { name, description, currency, closeDate, manufacturer, manufacturerCountry, labTestSupplier });

  return (
    <div className="space-y-5">
      {/* GB Name */}
      <div>
        <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
          Group Buy Name <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="e.g. Winter Peptide Run 2025"
          data-tour="basics-name-input"
          className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
          style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
        />
        <p className="text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>
          This is what members will see when browsing group buys
        </p>
      </div>

      {/* Description */}
      <div data-tour="basics-description">
        <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Tell members what this group buy is about, what products are included, and any important details..."
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-lg text-[14px] resize-none transition-colors"
          style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
        />
      </div>

      {/* Currency & Close Date (side by side on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-tour="basics-schedule">
        <div>
          <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
            Currency <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <select
            value={currency}
            onChange={event => setCurrency(event.target.value)}
            className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
          >
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="USDT">USDT</option>
          </select>
        </div>

        <div>
          <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
            Close Date
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={closeDate}
              onChange={event => setCloseDate(event.target.value)}
              className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>
            When should ordering close? Leave blank for no deadline
          </p>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="pt-3 border-t" style={{ borderColor: V2_CARD_BORDER }} data-tour="basics-supplier">
        <h4 className="text-[14px] font-bold mb-3" style={{ color: "var(--t-text)" }}>Supplier Information</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                Manufacturer Name
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={event => setManufacturer(event.target.value)}
                placeholder="e.g. QSC"
                className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>

            <div>
              <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                Manufacturer Country
              </label>
              <input
                type="text"
                value={manufacturerCountry}
                onChange={event => setManufacturerCountry(event.target.value)}
                placeholder="e.g. China"
                className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
              Lab Test Supplier
            </label>
            <input
              type="text"
              value={labTestSupplier}
              onChange={event => setLabTestSupplier(event.target.value)}
              placeholder="e.g. Janoshik"
              className="w-full h-10 px-3.5 rounded-lg text-[14px] transition-colors"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
            <p className="text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>
              Where will lab tests come from?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
