import { useState } from "react";
import {
  Package, Search, Filter, Download, ExternalLink, Clock,
  CheckCircle, Truck, MapPin, User, Calendar, ChevronDown, ChevronRight,
  X, Plus, Trash2,
} from "lucide-react";
import { V2_CARD_BORDER, TILE } from "./theme";

// ─── Workspace: Parcels Tab ──────────────────────────────────────────────────
// Masked shipping tracker — organiser ships to reshippers who forward to members.
// Track parcels with carrier updates and manage forwarding addresses.

interface TrackingUpdate {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

interface Parcel {
  id: string;
  orderId: string;
  memberName: string;
  memberUsername: string;
  reshipperName: string;
  reshipperAddress: string;
  carrier: string;
  trackingNumber: string;
  shippedDate: string;
  estimatedDelivery: string;
  status: "in_transit" | "out_for_delivery" | "delivered" | "exception";
  products: string[];
  trackingUpdates: TrackingUpdate[];
}

const SAMPLE_PARCELS: Parcel[] = [
  {
    id: "1",
    orderId: "ORD-001",
    memberName: "Alice Morgan",
    memberUsername: "@alice_m",
    reshipperName: "John's Reshipper",
    reshipperAddress: "123 Warehouse St, London, UK",
    carrier: "Royal Mail",
    trackingNumber: "RM123456789GB",
    shippedDate: "2024-07-08",
    estimatedDelivery: "2024-07-15",
    status: "in_transit",
    products: ["Semaglutide 5mg", "Tirzepatide 10mg"],
    trackingUpdates: [
      { timestamp: "2024-07-11T14:30:00", location: "Birmingham Depot", status: "In Transit", description: "Parcel is on its way to the next facility" },
      { timestamp: "2024-07-10T09:15:00", location: "Heathrow Sorting Centre", status: "Processed", description: "Parcel has been processed at sorting facility" },
      { timestamp: "2024-07-08T16:45:00", location: "Origin Depot", status: "Collected", description: "Parcel collected by carrier" },
    ],
  },
  {
    id: "2",
    orderId: "ORD-002",
    memberName: "Bob Kumar",
    memberUsername: "@bob_k",
    reshipperName: "Sarah's Forwarding",
    reshipperAddress: "456 Distribution Ave, Manchester, UK",
    carrier: "DHL Express",
    trackingNumber: "DHL987654321",
    shippedDate: "2024-07-09",
    estimatedDelivery: "2024-07-14",
    status: "out_for_delivery",
    products: ["Semaglutide 5mg"],
    trackingUpdates: [
      { timestamp: "2024-07-11T08:00:00", location: "Manchester Hub", status: "Out for Delivery", description: "Parcel is out for delivery" },
      { timestamp: "2024-07-10T12:30:00", location: "Manchester Hub", status: "Arrived", description: "Arrived at local delivery facility" },
      { timestamp: "2024-07-09T17:00:00", location: "London Gateway", status: "In Transit", description: "Parcel departed facility" },
    ],
  },
  {
    id: "3",
    orderId: "ORD-005",
    memberName: "Carol Smith",
    memberUsername: "@carol_s",
    reshipperName: "Mike's Mail Service",
    reshipperAddress: "789 Postal Rd, Birmingham, UK",
    carrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    shippedDate: "2024-07-05",
    estimatedDelivery: "2024-07-12",
    status: "delivered",
    products: ["Tirzepatide 10mg", "BPC-157 5mg"],
    trackingUpdates: [
      { timestamp: "2024-07-12T11:20:00", location: "Birmingham", status: "Delivered", description: "Delivered to recipient" },
      { timestamp: "2024-07-12T09:00:00", location: "Birmingham Hub", status: "Out for Delivery", description: "Out for delivery" },
      { timestamp: "2024-07-11T15:30:00", location: "Birmingham Hub", status: "Arrived", description: "Arrived at delivery facility" },
      { timestamp: "2024-07-10T08:00:00", location: "Coventry Hub", status: "In Transit", description: "In transit to next facility" },
    ],
  },
];

const STATUS_CONFIG = {
  in_transit: { label: "In Transit", color: "#4A6CF7", bg: "#E8ECFE" },
  out_for_delivery: { label: "Out for Delivery", color: "#F79009", bg: "#FEF0C7" },
  delivered: { label: "Delivered", color: "#12B76A", bg: "#D1FADF" },
  exception: { label: "Exception", color: "#F04438", bg: "#FEE4E2" },
};

// 17track API carriers (sample list)
const CARRIERS = [
  { code: "ups", name: "UPS" },
  { code: "fedex", name: "FedEx" },
  { code: "dhl", name: "DHL Express" },
  { code: "usps", name: "USPS" },
  { code: "royalmail", name: "Royal Mail" },
  { code: "parcelforce", name: "Parcelforce" },
  { code: "evri", name: "Evri (Hermes)" },
  { code: "dpd", name: "DPD" },
  { code: "yodel", name: "Yodel" },
  { code: "amazon", name: "Amazon Logistics" },
  { code: "dhlglobal", name: "DHL Global Mail" },
  { code: "tnt", name: "TNT" },
  { code: "gls", name: "GLS" },
  { code: "other", name: "Other (Custom URL)" },
];

export default function ParcelsTab() {
  const [parcels] = useState<Parcel[]>(SAMPLE_PARCELS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);
  const [showAddParcel, setShowAddParcel] = useState(false);

  // Add parcel form state
  const [label, setLabel] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [customTrackingUrl, setCustomTrackingUrl] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [notes, setNotes] = useState("");

  // Sample products from orders (in real app, fetch from orders)
  const availableProducts = ["Semaglutide 5mg", "Tirzepatide 10mg", "BPC-157 5mg", "TB-500 5mg"];

  const addItem = (item: string) => {
    if (item.trim() && !items.includes(item.trim())) {
      setItems([...items, item.trim()]);
      setItemInput("");
    }
  };

  const handleItemInputChange = (value: string) => {
    setItemInput(value);
  };

  const handleItemPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    // Split by common delimiters: newlines, commas, semicolons, pipes
    const parsedItems = pastedText
      .split(/[\n,;|]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (parsedItems.length > 1) {
      // Multiple items detected - add all unique ones
      const newItems = [...items];
      parsedItems.forEach(item => {
        if (!newItems.includes(item)) {
          newItems.push(item);
        }
      });
      setItems(newItems);
      setItemInput("");
    } else if (parsedItems.length === 1) {
      // Single item - just set the input
      setItemInput(parsedItems[0]);
    }
  };

  const removeItem = (item: string) => {
    setItems(items.filter((i) => i !== item));
  };

  const handleSubmit = () => {
    if (!label.trim() || !trackingNumber.trim() || !carrier) {
      alert("Please fill in label, tracking number, and carrier");
      return;
    }
    // In real app, save to backend
    alert("Parcel added successfully!");
    // Reset form
    setLabel("");
    setTrackingNumber("");
    setCarrier("");
    setCustomTrackingUrl("");
    setItems([]);
    setNotes("");
    setShowAddParcel(false);
  };

  // Filter parcels
  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      searchQuery === "" ||
      p.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.memberUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Status counts
  const statusCounts = {
    all: parcels.length,
    in_transit: parcels.filter((p) => p.status === "in_transit").length,
    out_for_delivery: parcels.filter((p) => p.status === "out_for_delivery").length,
    delivered: parcels.filter((p) => p.status === "delivered").length,
    exception: parcels.filter((p) => p.status === "exception").length,
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Parcels (Masked Shipping)</h2>
          <p className="text-[12px] sm:text-[13px] mt-1" style={{ color: "var(--t-subtle)" }}>
            Track parcels shipped to reshippers for member forwarding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddParcel(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white self-start sm:self-auto"
            style={{ background: "var(--t-blue)" }}
          >
            <Package className="w-3.5 h-3.5" /> Add Parcel
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold hover:bg-black/5 self-start sm:self-auto" style={{ color: "var(--t-blue)", border: `1px solid ${V2_CARD_BORDER}` }}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              placeholder="Search by order, member, or tracking number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-lg text-[13px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: statusFilter === status ? "var(--t-blue-10)" : "transparent",
                  color: statusFilter === status ? "var(--t-blue)" : "var(--t-muted)",
                  border: `1px solid ${statusFilter === status ? "var(--t-blue)" : V2_CARD_BORDER}`,
                }}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parcels list */}
      {filteredParcels.length > 0 ? (
        <div className="space-y-3">
          {filteredParcels.map((parcel) => {
            const isExpanded = expandedParcel === parcel.id;
            const statusConfig = STATUS_CONFIG[parcel.status];

            return (
              <div key={parcel.id} className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                {/* Header */}
                <button
                  onClick={() => setExpandedParcel(isExpanded ? null : parcel.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-black/[0.02] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  )}

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_120px] gap-2 sm:gap-4">
                    {/* Order ID */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Order</div>
                      <div className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>{parcel.orderId}</div>
                    </div>

                    {/* Member */}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Member</div>
                      <div className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{parcel.memberName}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--t-subtle)" }}>{parcel.memberUsername}</div>
                    </div>

                    {/* Carrier */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Carrier</div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{parcel.carrier}</div>
                    </div>

                    {/* Status */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--t-subtle)" }}>Status</div>
                      <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 space-y-4" style={{ background: "var(--t-surface2)", borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                    {/* Tracking info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Tracking Number</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono font-semibold" style={{ color: "var(--t-text)" }}>{parcel.trackingNumber}</span>
                          <button
                            onClick={() => window.open(`https://track.example.com/${parcel.trackingNumber}`, "_blank")}
                            className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/50"
                            style={{ color: "var(--t-blue)" }}
                          >
                            Track <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Reshipper</div>
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{parcel.reshipperName}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{parcel.reshipperAddress}</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Shipped</div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                          <span className="text-[13px]" style={{ color: "var(--t-text)" }}>
                            {new Date(parcel.shippedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Est. Delivery</div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                          <span className="text-[13px]" style={{ color: "var(--t-text)" }}>
                            {new Date(parcel.estimatedDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>Products</div>
                      <div className="flex flex-wrap gap-1.5">
                        {parcel.products.map((product, i) => (
                          <span key={i} className="text-[11px] px-2 py-1 rounded-md" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
            {searchQuery || statusFilter !== "all" ? "No parcels found" : "No parcels yet"}
          </h3>
          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
            {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Shipped orders will appear here"}
          </p>
        </div>
      )}

      {/* Add Parcel Modal */}
      {showAddParcel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddParcel(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Add Parcel</h3>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Create a new tracked parcel shipment</p>
              </div>
              <button onClick={() => setShowAddParcel(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ color: "var(--t-subtle)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Label <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch 5 to UK Reshipper"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[13px] outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>Internal name to identify this parcel</p>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Tracking Number <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1Z999AA10123456784"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[13px] font-mono outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>

              {/* Carrier */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Carrier (17track API) <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[13px] outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                >
                  <option value="">Select carrier...</option>
                  {CARRIERS.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>Connected to 17track API for automatic tracking updates</p>
              </div>

              {/* Custom Tracking URL */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Custom Tracking URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://track.carrier.com/..."
                  value={customTrackingUrl}
                  onChange={(e) => setCustomTrackingUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-[13px] outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--t-subtle)" }}>Override the default carrier tracking URL</p>
              </div>

              {/* Items in Parcel */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Items in Parcel
                </label>

                {/* Product suggestions */}
                {availableProducts.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>Quick Add from Products:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableProducts.map((product) => (
                        <button
                          key={product}
                          onClick={() => addItem(product)}
                          disabled={items.includes(product)}
                          className="text-[11px] px-2 py-1 rounded-md transition-opacity disabled:opacity-40"
                          style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}
                        >
                          <Plus className="w-3 h-3 inline mr-0.5" /> {product}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom item input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type or paste item name (or paste a list)..."
                    value={itemInput}
                    onChange={(e) => handleItemInputChange(e.target.value)}
                    onPaste={handleItemPaste}
                    onKeyPress={(e) => e.key === "Enter" && addItem(itemInput)}
                    className="flex-1 h-10 px-3 rounded-lg text-[13px] outline-none"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                  <button
                    onClick={() => addItem(itemInput)}
                    className="px-3 h-10 rounded-lg text-[12px] font-semibold"
                    style={{ background: "var(--t-blue)", color: "#fff" }}
                  >
                    Add
                  </button>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--t-subtle)" }}>
                  Paste multiple items separated by commas, newlines, or semicolons
                </p>

                {/* Added items */}
                {items.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                        <span className="text-[12px]" style={{ color: "var(--t-text)" }}>{item}</span>
                        <button onClick={() => removeItem(item)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50" style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Add any internal notes about this parcel..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] resize-none outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white px-5 py-4 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
              <button
                onClick={() => setShowAddParcel(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-black/5"
                style={{ color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                Add Parcel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
