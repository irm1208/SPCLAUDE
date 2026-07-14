import { useState, useEffect, useRef } from "react";
import { Search, Download, ChevronDown, Package, Clock, CheckCircle2, XCircle, AlertCircle, X, Edit2, Send, Copy, Plus, Minus, Trash2, Flag, Truck, Upload } from "lucide-react";
import { V2_CARD_BORDER } from "./theme";
import { fmtMoney } from "./data";
import { loadGb, saveGb } from "./storage";
import { SavedViewsSidebar, useSavedViews } from "./SavedViews";
import type { OrganiserOrder as Order } from "./domain/order";
import { SAMPLE_ORDERS } from "./domain/sample-orders";

// Relative time for the card header, e.g. "03 min ago"
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return `${String(mins).padStart(2, "0")} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Workspace: Orders Tab ───────────────────────────────────────────────────
// Main order management view. Shows all orders with filters, search, status badges,
// and quick actions.

const STATUS_CONFIG = {
  pending: { label: "Pending Payment", color: "#D97706", bg: "rgba(217,119,6,0.10)", icon: Clock },
  paid: { label: "Paid", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)", icon: CheckCircle2 },
  processing: { label: "Processing", color: "#4A6CF7", bg: "rgba(74,108,247,0.10)", icon: Package },
  shipped: { label: "Shipped", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)", icon: Package },
  delivered: { label: "Delivered", color: "#16A34A", bg: "rgba(22,163,74,0.10)", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.10)", icon: XCircle },
  dispatched: { label: "Dispatched", color: "#1B3A7A", bg: "rgba(27,58,122,0.10)", icon: Truck },
};

export default function OrdersTab({ selectedGbId, highlightId }: { selectedGbId?: string; highlightId?: string } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["all"]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [paymentMethodFilters, setPaymentMethodFilters] = useState<string[]>([]);
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Load orders from GB-scoped storage
  const [orders, setOrders] = useState<Order[]>(() => loadGb<Order[]>(selectedGbId, "orders", SAMPLE_ORDERS, "orders"));

  useEffect(() => {
    setOrders(loadGb<Order[]>(selectedGbId, "orders", SAMPLE_ORDERS, "orders"));
  }, [selectedGbId]);

  // Highlight specific order if passed via highlightId
  useEffect(() => {
    if (highlightId) {
      setExpandedOrders([highlightId]);
      setTimeout(() => {
        const el = document.querySelector(`[data-order-id="${highlightId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlightId]);

  // Dropdown open states
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);

  // Edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editTxid, setEditTxid] = useState("");
  const [telegramMessage, setTelegramMessage] = useState("");
  const [editProducts, setEditProducts] = useState<{ name: string; quantity: number; price: number }[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("1");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductMode, setNewProductMode] = useState<"existing" | "custom">("existing");
  const [viewingProofImage, setViewingProofImage] = useState<string | null>(null);

  // Flag system
  const [flagNote, setFlagNote] = useState("");
  const [flagDueDate, setFlagDueDate] = useState("");
  const [flagDueTime, setFlagDueTime] = useState("");

  // Multi-select
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkAddProduct, setShowBulkAddProduct] = useState(false);
  const [bulkProductName, setBulkProductName] = useState("");
  const [bulkProductQuantity, setBulkProductQuantity] = useState("1");
  const [bulkProductPrice, setBulkProductPrice] = useState("");

  // Bulk task
  const [showBulkTaskModal, setShowBulkTaskModal] = useState(false);
  const [bulkTaskNote, setBulkTaskNote] = useState("");
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState("");
  const [bulkTaskDueTime, setBulkTaskDueTime] = useState("");

  // CSV Import
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Saved Views
  const { views, activeViewId, setActiveViewId, createView, deleteView, getActiveView } =
    useSavedViews(`v2:orders:savedViews:${selectedGbId}`);

  // Expanded orders
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Get unique products from all orders (for dropdown)
  const uniqueProducts = Array.from(
    new Set(orders.flatMap(o => o.products.map(p => JSON.stringify({ name: p.name, price: p.price }))))
  ).map(s => JSON.parse(s));

  // Get unique countries and payment methods from orders (for filters)
  const uniqueCountries = Array.from(new Set(orders.map(o => o.country)));
  const uniquePaymentMethods = Array.from(new Set(orders.map(o => o.paymentMethod)));

  const toggleFilter = (value: string, current: string[], setter: (v: string[]) => void) => {
    if (value === "all") {
      setter(["all"]);
    } else {
      const newFilters = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current.filter(v => v !== "all"), value];
      setter(newFilters.length === 0 ? ["all"] : newFilters);
    }
  };

  // Apply saved view filters
  useEffect(() => {
    const view = getActiveView();
    if (view) {
      // Apply filters from saved view
      if (view.filters.statusFilters) setStatusFilters(view.filters.statusFilters);
      if (view.filters.countryFilters) setCountryFilters(view.filters.countryFilters);
      if (view.filters.paymentMethodFilters) setPaymentMethodFilters(view.filters.paymentMethodFilters);
      if (view.filters.searchQuery !== undefined) setSearchQuery(view.filters.searchQuery);
      if (view.filters.orderDateFrom !== undefined) setOrderDateFrom(view.filters.orderDateFrom);
      if (view.filters.orderDateTo !== undefined) setOrderDateTo(view.filters.orderDateTo);
      if (view.filters.paymentDateFrom !== undefined) setPaymentDateFrom(view.filters.paymentDateFrom);
      if (view.filters.paymentDateTo !== undefined) setPaymentDateTo(view.filters.paymentDateTo);
      if (view.filters.sortOrder) setSortOrder(view.filters.sortOrder);
    }
  }, [activeViewId]);

  // Get current filters for saving
  const currentFilters = {
    statusFilters,
    countryFilters,
    paymentMethodFilters,
    searchQuery,
    orderDateFrom,
    orderDateTo,
    paymentDateFrom,
    paymentDateTo,
    sortOrder,
  };

  // Update badge counts for saved views
  const viewsWithBadges = views.map(view => {
    // Calculate count by applying view's filters
    const count = orders.filter(order => {
      const filters = view.filters;

      const matchesSearch = !filters.searchQuery ||
        order.memberUsername.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        order.memberName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(filters.searchQuery.toLowerCase());

      const matchesStatus = !filters.statusFilters || filters.statusFilters.includes("all") ||
        (filters.statusFilters.includes("paid") && order.status === "paid") ||
        (filters.statusFilters.includes("unpaid") && order.status === "pending") ||
        (filters.statusFilters.includes("pending-confirmation") && order.status === "processing");

      const matchesCountry = !filters.countryFilters || filters.countryFilters.length === 0 ||
        filters.countryFilters.includes(order.country);

      const matchesPaymentMethod = !filters.paymentMethodFilters || filters.paymentMethodFilters.length === 0 ||
        filters.paymentMethodFilters.includes(order.paymentMethod);

      return matchesSearch && matchesStatus && matchesCountry && matchesPaymentMethod;
    }).length;

    return { ...view, badge: count };
  });

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditTrackingNumber(order.trackingNumber || "");
    setEditInternalNotes(order.internalNotes || "");
    setEditTxid(order.paymentProof?.value || "");
    setTelegramMessage("");
    setEditProducts([...order.products]);
    setNewProductName("");
    setNewProductQuantity("1");
    setNewProductPrice("");
    setFlagNote(order.flagged?.note || "");
    setFlagDueDate(order.flagged?.dueDate || "");
    setFlagDueTime(order.flagged?.dueTime || "");
  };

  const closeEditModal = () => {
    setEditingOrder(null);
  };

  const saveOrderChanges = () => {
    // In real implementation, this would save to backend
    console.log("Saving order changes:", {
      orderId: editingOrder?.id,
      status: editStatus,
      trackingNumber: editTrackingNumber,
      internalNotes: editInternalNotes,
      txid: editTxid,
    });
    closeEditModal();
  };

  const sendTelegramMessage = () => {
    console.log("Sending Telegram message to", editingOrder?.memberUsername, ":", telegramMessage);
    setTelegramMessage("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In real implementation, show a toast notification
    console.log("Copied to clipboard:", text);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const bulkAddProductToOrders = () => {
    const targetOrders = selectedOrders.length > 0 ? selectedOrders : filteredOrders.map(o => o.id);
    console.log("Adding product to orders:", {
      orders: targetOrders,
      product: bulkProductName,
      quantity: bulkProductQuantity,
      price: bulkProductPrice,
    });
    setShowBulkAddProduct(false);
    setBulkProductName("");
    setBulkProductQuantity("1");
    setBulkProductPrice("");
    setSelectedOrders([]);
  };

  const bulkAddTask = () => {
    // Update the orders to add the flag
    const updatedOrders = orders.map(order =>
      selectedOrders.includes(order.id)
        ? {
            ...order,
            flagged: {
              note: bulkTaskNote,
              dueDate: bulkTaskDueDate,
              dueTime: bulkTaskDueTime
            }
          }
        : order
    );

    setOrders(updatedOrders);
    saveGb(selectedGbId, "orders", updatedOrders);

    // Add task to todo list (via GB-scoped storage for cross-tab communication)
    const existingTodos = loadGb<any[]>(selectedGbId, "todos", [], "todos");
    const newTodo = {
      id: String(Date.now()),
      title: `Task for ${selectedOrders.length} order${selectedOrders.length !== 1 ? 's' : ''}: ${selectedOrders.join(', ')}`,
      description: bulkTaskNote,
      status: "todo",
      dueDate: bulkTaskDueDate,
      dueTime: bulkTaskDueTime,
      linkedOrderIds: selectedOrders,
      createdAt: new Date().toISOString(),
    };
    saveGb(selectedGbId, "todos", [newTodo, ...existingTodos]);

    // Trigger a storage event for other components
    window.dispatchEvent(new Event('storage'));

    console.log("Task added to orders and todo list:", newTodo);

    setShowBulkTaskModal(false);
    setBulkTaskNote("");
    setBulkTaskDueDate("");
    setBulkTaskDueTime("");
    setSelectedOrders([]);
  };

  // Additional bulk actions
  const bulkMarkAsPaid = () => {
    const updatedOrders = orders.map(order =>
      selectedOrders.includes(order.id)
        ? { ...order, status: "paid" as Order["status"], paidAt: new Date().toISOString() }
        : order
    );
    setOrders(updatedOrders);
    saveGb(selectedGbId, "orders", updatedOrders);
    setSelectedOrders([]);
  };

  const bulkMarkAsDispatched = () => {
    const updatedOrders = orders.map(order =>
      selectedOrders.includes(order.id)
        ? { ...order, status: "dispatched" as Order["status"] }
        : order
    );
    setOrders(updatedOrders);
    saveGb(selectedGbId, "orders", updatedOrders);
    setSelectedOrders([]);
  };

  const bulkExportCSV = () => {
    const selectedOrderData = orders.filter(o => selectedOrders.includes(o.id));
    const csv = [
      // Header
      ["Order ID", "Member", "Username", "Status", "Total", "Payment Method", "Country", "Products", "Created At"].join(","),
      // Rows
      ...selectedOrderData.map(o => [
        o.id,
        o.memberName,
        o.memberUsername,
        o.status,
        o.total,
        o.paymentMethod,
        o.country,
        o.products.map(p => `${p.name} x${p.quantity}`).join("; "),
        o.createdAt,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Import for tracking numbers
  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());

      // Skip header if present (check if first line contains "order" or "tracking")
      const startIdx = lines[0].toLowerCase().includes('order') || lines[0].toLowerCase().includes('tracking') ? 1 : 0;

      const updates: Record<string, string> = {};
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2) {
          const orderId = cols[0];
          const tracking = cols[1];
          if (orderId && tracking) {
            updates[orderId] = tracking;
          }
        }
      }

      // Apply updates
      const updatedOrders = orders.map(order =>
        updates[order.id]
          ? { ...order, trackingNumber: updates[order.id], status: "dispatched" as Order["status"] }
          : order
      );

      setOrders(updatedOrders);
      saveGb(selectedGbId, "orders", updatedOrders);
      setCsvImporting(false);
      setShowCsvImportModal(false);
      setCsvFile(null);
    };

    reader.readAsText(csvFile);
  };

  const updateProductQuantity = (index: number, change: number) => {
    setEditProducts(prev => prev.map((p, i) =>
      i === index ? { ...p, quantity: Math.max(1, p.quantity + change) } : p
    ));
  };

  const removeProduct = (index: number) => {
    setEditProducts(prev => prev.filter((_, i) => i !== index));
  };

  const addNewProduct = () => {
    if (newProductName && newProductPrice) {
      setEditProducts(prev => [...prev, {
        name: newProductName,
        quantity: parseInt(newProductQuantity) || 1,
        price: parseFloat(newProductPrice),
      }]);
      setNewProductName("");
      setNewProductQuantity("1");
      setNewProductPrice("");
    }
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.memberUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (order.paymentProof?.value && order.paymentProof.value.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilters.includes("all") ||
                           (statusFilters.includes("paid") && order.status === "paid") ||
                           (statusFilters.includes("unpaid") && order.status === "pending") ||
                           (statusFilters.includes("pending-confirmation") && order.status === "processing");

      const matchesCountry = countryFilters.length === 0 || countryFilters.includes(order.country);
      const matchesPaymentMethod = paymentMethodFilters.length === 0 || paymentMethodFilters.includes(order.paymentMethod);

      // Date filters
      const orderDate = new Date(order.createdAt);
      const matchesOrderDate = (!orderDateFrom || orderDate >= new Date(orderDateFrom)) &&
                              (!orderDateTo || orderDate <= new Date(orderDateTo));

      const paymentDate = order.paidAt ? new Date(order.paidAt) : null;
      const matchesPaymentDate = !paymentDateFrom && !paymentDateTo ||
                                 (paymentDate &&
                                  (!paymentDateFrom || paymentDate >= new Date(paymentDateFrom)) &&
                                  (!paymentDateTo || paymentDate <= new Date(paymentDateTo)));

      return matchesSearch && matchesStatus && matchesCountry && matchesPaymentMethod && matchesOrderDate && matchesPaymentDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <>
    <div className="flex gap-4">
      {/* Saved Views Sidebar - Desktop only */}
      <div className="hidden lg:block w-64 shrink-0">
        <SavedViewsSidebar
          views={viewsWithBadges}
          activeViewId={activeViewId}
          onSelectView={setActiveViewId}
          onCreateView={createView}
          onDeleteView={deleteView}
          currentFilters={currentFilters}
          storageKey={`v2:orders:savedViews:${selectedGbId}`}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Orders</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
            {selectedOrders.length > 0 && <span> • {selectedOrders.length} selected</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedOrders.length > 0 && (
            <>
              <button
                onClick={bulkMarkAsPaid}
                className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "#16A34A", color: "#fff" }}
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Paid
              </button>
              <button
                onClick={bulkMarkAsDispatched}
                className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "#0078D4", color: "#fff" }}
              >
                <Truck className="w-4 h-4" /> Mark as Dispatched
              </button>
              <button
                onClick={bulkExportCSV}
                className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "#6B7280", color: "#fff" }}
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={() => setShowBulkAddProduct(true)}
                className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "var(--t-blue)", color: "#fff" }}
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
              <button
                onClick={() => setShowBulkTaskModal(true)}
                className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5"
                style={{ background: "#D97706", color: "#fff" }}
              >
                <Flag className="w-4 h-4" /> Add Task
              </button>
            </>
          )}
          <button
            onClick={() => setShowCsvImportModal(true)}
            className="w-full sm:w-auto h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5"
            style={{ background: "#fff", border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button className="w-full sm:w-auto h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ background: "#fff", border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-3 sm:p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        {/* Search and controls row */}
        <div className="flex flex-col gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              placeholder="Search by member, username, order ID, or TXID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg text-[13px]"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
            />
          </div>

          {/* Filters and Sort row */}
          <div className="flex gap-2">
            {/* Filters dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setFiltersDropdownOpen(!filtersDropdownOpen)}
                className="w-full h-10 px-3 sm:px-4 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
              >
                Filters
                <ChevronDown className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </button>
              {filtersDropdownOpen && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 rounded-lg bg-white shadow-lg z-10 p-4 w-full sm:w-auto" style={{ border: `1px solid ${V2_CARD_BORDER}`, minWidth: "320px", maxWidth: "100vw" }}>
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div className="relative">
                    <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Status</label>
                    <button
                      onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                      className="w-full h-10 px-3 pr-8 rounded-lg text-[13px] text-left flex items-center justify-between"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    >
                      <span>{statusFilters.includes("all") ? "All" : `${statusFilters.length} selected`}</span>
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white shadow-lg z-20 p-2" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        {[
                          { value: "all", label: "All" },
                          { value: "paid", label: "Paid" },
                          { value: "unpaid", label: "Unpaid" },
                          { value: "pending-confirmation", label: "Pending Payment Confirmation" },
                        ].map(option => (
                          <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={statusFilters.includes(option.value)}
                              onChange={() => toggleFilter(option.value, statusFilters, setStatusFilters)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: "var(--t-blue)" }}
                            />
                            <span className="text-[13px]" style={{ color: "var(--t-text)" }}>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Country Filter */}
                  <div className="relative">
                    <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Country</label>
                    <button
                      onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      className="w-full h-10 px-3 pr-8 rounded-lg text-[13px] text-left flex items-center justify-between"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    >
                      <span>{countryFilters.length === 0 ? "All Countries" : `${countryFilters.length} selected`}</span>
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
                    </button>
                    {countryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white shadow-lg z-20 p-2" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        {uniqueCountries.map(country => (
                          <label key={country} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={countryFilters.includes(country)}
                              onChange={() => toggleFilter(country, countryFilters, setCountryFilters)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: "var(--t-blue)" }}
                            />
                            <span className="text-[13px]" style={{ color: "var(--t-text)" }}>{country}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Method Filter */}
                  <div className="relative">
                    <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Payment Method</label>
                    <button
                      onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}
                      className="w-full h-10 px-3 pr-8 rounded-lg text-[13px] text-left flex items-center justify-between"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                    >
                      <span>{paymentMethodFilters.length === 0 ? "All Methods" : `${paymentMethodFilters.length} selected`}</span>
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
                    </button>
                    {paymentDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white shadow-lg z-20 p-2" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        {uniquePaymentMethods.map(method => (
                          <label key={method} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={paymentMethodFilters.includes(method)}
                              onChange={() => toggleFilter(method, paymentMethodFilters, setPaymentMethodFilters)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: "var(--t-blue)" }}
                            />
                            <span className="text-[13px]" style={{ color: "var(--t-text)" }}>{method}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date Filter */}
                  <div className="pt-3 border-t" style={{ borderColor: V2_CARD_BORDER }}>
                    <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Date</label>
                    <div className="space-y-3">
                      {/* Order Date */}
                      <div>
                        <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>Order Date</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={orderDateFrom}
                            onChange={(e) => setOrderDateFrom(e.target.value)}
                            placeholder="From"
                            className="w-full h-9 px-2 rounded-md text-[12px]"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                          />
                          <input
                            type="date"
                            value={orderDateTo}
                            onChange={(e) => setOrderDateTo(e.target.value)}
                            placeholder="To"
                            className="w-full h-9 px-2 rounded-md text-[12px]"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                          />
                        </div>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--t-subtle)" }}>Payment Date</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={paymentDateFrom}
                            onChange={(e) => setPaymentDateFrom(e.target.value)}
                            placeholder="From"
                            className="w-full h-9 px-2 rounded-md text-[12px]"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                          />
                          <input
                            type="date"
                            value={paymentDateTo}
                            onChange={(e) => setPaymentDateTo(e.target.value)}
                            placeholder="To"
                            className="w-full h-9 px-2 rounded-md text-[12px]"
                            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Sort By */}
            <div className="relative flex-1">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="w-full h-10 px-3 pr-8 rounded-lg text-[13px] appearance-none cursor-pointer"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
              >
                <option value="newest">Newest Order</option>
                <option value="oldest">Oldest Order</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl p-12 text-center bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>No orders found</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            <input
              type="checkbox"
              checked={selectedOrders.length === filteredOrders.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--t-blue)" }}
            />
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
              Select All ({filteredOrders.length})
            </span>
          </div>

          <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const config = STATUS_CONFIG[order.status];
            const isExpanded = expandedOrders.includes(order.id);
            return (
              <div
                key={order.id}
                data-order-id={order.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  border: `1px solid ${order.flagged ? "#D97706" : V2_CARD_BORDER}`,
                  background: "#fff",
                }}
              >
                <div className="p-4 pb-0">
                  {/* Header: checkbox + avatar + name + status pill */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="w-4 h-4 mt-3.5 rounded shrink-0"
                      style={{ accentColor: "var(--t-blue)" }}
                    />
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 text-[16px] font-bold" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                      {order.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[16px] sm:text-[18px] font-bold truncate" style={{ color: "var(--t-text)" }}>
                          {order.memberName}
                        </h3>
                        <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-bold shrink-0" style={{ color: config.color, border: `1.5px solid ${config.color}` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] mt-1" style={{ color: "var(--t-muted)" }}>
                        <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-blue)" }} />
                        <span className="truncate">{order.shippingOption}</span>
                        <span style={{ color: "var(--t-subtle)" }}>•</span>
                        <span className="whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>{timeAgo(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed my-3" style={{ borderColor: V2_CARD_BORDER }} />

                  {/* Meta row: order id + payment */}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="uppercase tracking-wide shrink-0" style={{ color: "var(--t-subtle)" }}>Order :</span>
                      <span className="font-bold" style={{ color: "var(--t-text)" }}>{order.id}</span>
                      <span className="truncate" style={{ color: "var(--t-subtle)" }}>@{order.memberUsername}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Payment :</span>
                      <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: "var(--t-blue)", background: "var(--t-blue-08)" }}>{order.paymentMethod}</span>
                    </div>
                  </div>

                  {/* TXID / proof row */}
                  {order.paymentProof && (
                    <div className="flex items-center gap-1.5 text-[12px] mt-1.5">
                      {order.paymentProof.type === "txid" ? (
                        <>
                          <span className="uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>TXID :</span>
                          <span className="font-mono text-[11px]" style={{ color: "var(--t-muted)" }}>{order.paymentProof.value.slice(0, 10)}...{order.paymentProof.value.slice(-6)}</span>
                          <button
                            onClick={() => copyToClipboard(order.paymentProof!.value)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                            title="Copy full TXID"
                          >
                            <Copy className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Proof :</span>
                          <button
                            onClick={() => setViewingProofImage(order.paymentProof!.value)}
                            className="font-bold"
                            style={{ color: "var(--t-blue)" }}
                          >
                            View Screenshot →
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="border-t border-dashed my-3" style={{ borderColor: V2_CARD_BORDER }} />

                  {/* Items: qty badge + name + line total */}
                  <div className="space-y-2.5">
                    {order.products.map((product, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                          {product.quantity}
                        </span>
                        <span className="flex-1 text-[13px] sm:text-[14px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{product.name}</span>
                        <span className="text-[13px] sm:text-[14px] shrink-0" style={{ color: "var(--t-muted)" }}>{fmtMoney(product.price * product.quantity, "GBP")}</span>
                      </div>
                    ))}
                  </div>

                  {/* Flag / internal notes */}
                  {(order.flagged || order.internalNotes) && (
                    <div className="space-y-1.5 mt-3">
                      {order.flagged && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(217,119,6,0.08)" }}>
                          <Flag className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
                          <span className="text-[11px]" style={{ color: "#D97706" }}>{order.flagged.note}</span>
                        </div>
                      )}
                      {order.internalNotes && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}>
                          <span className="text-[10px] font-bold uppercase mt-0.5 shrink-0" style={{ color: "#D97706" }}>Note</span>
                          <span className="text-[11px]" style={{ color: "#D97706" }}>{order.internalNotes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mx-4 mt-3 pt-3 border-t border-dashed space-y-3" style={{ borderColor: V2_CARD_BORDER }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Shipping</div>
                        <div className="text-[12px]" style={{ color: "var(--t-text)" }}>{order.shippingOption}</div>
                        <div className="text-[12px]" style={{ color: "var(--t-muted)" }}>{order.country}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Payment</div>
                        <div className="text-[12px]" style={{ color: "var(--t-text)" }}>{order.paymentMethod}</div>
                        {order.paidAt && <div className="text-[12px]" style={{ color: "var(--t-muted)" }}>Paid {new Date(order.paidAt).toLocaleDateString()}</div>}
                      </div>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Tracking</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--t-muted)", background: "var(--t-surface2)" }}>{order.trackingNumber}</span>
                          <button
                            onClick={() => copyToClipboard(order.trackingNumber!)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                            title="Copy tracking number"
                          >
                            <Copy className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                      Created {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Footer: neutral reference action band */}
                <div className="px-4 pt-3 pb-4 mt-2" style={{ background: "linear-gradient(to top, #F5F5F7 0%, rgba(245,245,247,0.58) 58%, rgba(245,245,247,0) 100%)" }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[12px] uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Total :</span>
                    <span className="text-[22px] sm:text-[24px] font-extrabold" style={{ color: "var(--t-text)" }}>{fmtMoney(order.total, "GBP")}</span>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => openEditModal(order)}
                      className="flex-1 h-9 rounded-lg text-[13px] font-bold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.10)", color: "var(--t-text)" }}
                    >
                      Edit Order
                    </button>
                    <button
                      onClick={() => toggleOrderExpand(order.id)}
                      className="flex-1 h-9 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: "#17181A" }}
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Bulk Add Task Modal */}
      {showBulkTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl bg-white max-w-md w-full shadow-xl" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: V2_CARD_BORDER }}>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                <Flag className="w-5 h-5" style={{ color: "#D97706" }} />
                Add Task to {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}
              </h3>
              <button
                onClick={() => setShowBulkTaskModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Task / Note</label>
                <textarea
                  value={bulkTaskNote}
                  onChange={(e) => setBulkTaskNote(e.target.value)}
                  placeholder="e.g. Follow up on delivery status, check if payment received, etc."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] resize-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Due Date</label>
                  <input
                    type="date"
                    value={bulkTaskDueDate}
                    onChange={(e) => setBulkTaskDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-[12px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Due Time</label>
                  <input
                    type="time"
                    value={bulkTaskDueTime}
                    onChange={(e) => setBulkTaskDueTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-[12px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg" style={{ background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: "#D97706" }}>
                  <Flag className="w-3 h-3 inline mr-1" />
                  What will happen:
                </div>
                <ul className="text-[11px] space-y-0.5" style={{ color: "#D97706" }}>
                  <li>• Selected orders will be flagged and highlighted</li>
                  <li>• A task will be added to your Todo List</li>
                  <li>• You'll be notified when the due date/time arrives</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: V2_CARD_BORDER }}>
              <button
                onClick={() => setShowBulkTaskModal(false)}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={bulkAddTask}
                disabled={!bulkTaskNote}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: "#D97706" }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Product Modal */}
      {showBulkAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl bg-white max-w-md w-full shadow-xl" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: V2_CARD_BORDER }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                Add Product to {selectedOrders.length} Order{selectedOrders.length !== 1 ? 's' : ''}
              </h3>
              <button
                onClick={() => setShowBulkAddProduct(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Product Name</label>
                <input
                  type="text"
                  value={bulkProductName}
                  onChange={(e) => setBulkProductName(e.target.value)}
                  placeholder="e.g. Semaglutide 5mg"
                  className="w-full h-10 px-3 rounded-lg text-[13px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Quantity</label>
                  <input
                    type="number"
                    value={bulkProductQuantity}
                    onChange={(e) => setBulkProductQuantity(e.target.value)}
                    min="1"
                    className="w-full h-10 px-3 rounded-lg text-[13px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--t-text)" }}>Price (each)</label>
                  <input
                    type="number"
                    value={bulkProductPrice}
                    onChange={(e) => setBulkProductPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full h-10 px-3 rounded-lg text-[13px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: V2_CARD_BORDER }}>
              <button
                onClick={() => setShowBulkAddProduct(false)}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={bulkAddProductToOrders}
                disabled={!bulkProductName || !bulkProductPrice}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--t-blue)" }}
              >
                Add to Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            {/* Header: avatar + customer, matching order card */}
            <div className="sticky top-0 bg-white p-4 pb-3 z-10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[16px] font-bold" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                  {editingOrder.memberName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold truncate" style={{ color: "var(--t-text)" }}>{editingOrder.memberName}</h3>
                  <div className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
                    Editing <span className="font-bold" style={{ color: "var(--t-text)" }}>{editingOrder.id}</span> · @{editingOrder.memberUsername}
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 shrink-0"
                >
                  <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
                </button>
              </div>
              <div className="border-t border-dashed mt-3" style={{ borderColor: V2_CARD_BORDER }} />
            </div>

            <div className="px-4 pb-4 space-y-4">
              {/* Items — same qty-badge rows as the card */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Items</div>
                <div className="space-y-2 mb-3">
                  {editProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                        {product.quantity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{product.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{fmtMoney(product.price, "GBP")} each</div>
                      </div>
                      <div className="flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                        <button
                          onClick={() => updateProductQuantity(index, -1)}
                          className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                        </button>
                        <span className="w-7 text-center text-[12px] font-bold border-x" style={{ color: "var(--t-text)", borderColor: V2_CARD_BORDER }}>{product.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(index, 1)}
                          className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeProduct(index)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add product */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-surface2)" }}>
                  <div className="flex rounded-full p-0.5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                    <button
                      onClick={() => setNewProductMode("existing")}
                      className="flex-1 h-7 rounded-full text-[12px] font-bold transition-colors"
                      style={{
                        background: newProductMode === "existing" ? "#17181A" : "transparent",
                        color: newProductMode === "existing" ? "#fff" : "var(--t-subtle)"
                      }}
                    >
                      Existing Product
                    </button>
                    <button
                      onClick={() => setNewProductMode("custom")}
                      className="flex-1 h-7 rounded-full text-[12px] font-bold transition-colors"
                      style={{
                        background: newProductMode === "custom" ? "#17181A" : "transparent",
                        color: newProductMode === "custom" ? "#fff" : "var(--t-subtle)"
                      }}
                    >
                      Custom Product
                    </button>
                  </div>

                  {newProductMode === "existing" ? (
                    <select
                      value={newProductName}
                      onChange={(e) => {
                        const selected = uniqueProducts.find(p => p.name === e.target.value);
                        setNewProductName(e.target.value);
                        if (selected) setNewProductPrice(selected.price.toString());
                      }}
                      className="w-full h-9 px-3 rounded-lg text-[13px] bg-white"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                    >
                      <option value="">Select a product...</option>
                      {uniqueProducts.map((product, i) => (
                        <option key={i} value={product.name}>
                          {product.name} ({fmtMoney(product.price, "GBP")})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Custom product name"
                      className="w-full h-9 px-3 rounded-lg text-[13px] bg-white"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newProductQuantity}
                      onChange={(e) => setNewProductQuantity(e.target.value)}
                      placeholder="Qty"
                      min="1"
                      className="w-full h-9 px-3 rounded-lg text-[13px] bg-white"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                    />
                    <input
                      type="number"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      placeholder="Price"
                      step="0.01"
                      className="w-full h-9 px-3 rounded-lg text-[13px] bg-white"
                      style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                      disabled={newProductMode === "existing" && newProductName !== ""}
                    />
                  </div>
                  <button
                    onClick={addNewProduct}
                    disabled={!newProductName || !newProductPrice}
                    className="w-full h-9 rounded-lg text-[13px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 bg-white"
                    style={{ border: `1px dashed rgba(0,0,0,0.2)`, color: "var(--t-text)" }}
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed" style={{ borderColor: V2_CARD_BORDER }} />

              {/* Status + Tracking side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Status</div>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-[13px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  >
                    <option value="pending">Pending Payment</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Tracking Number</div>
                  <input
                    type="text"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full h-10 px-3 rounded-lg text-[13px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                </div>
              </div>

              {/* TXID */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Transaction ID (TXID)</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTxid}
                    onChange={(e) => setEditTxid(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 h-10 px-3 rounded-lg text-[12px] font-mono"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                  {editTxid && (
                    <button
                      onClick={() => copyToClipboard(editTxid)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 shrink-0"
                      style={{ border: `1px solid ${V2_CARD_BORDER}` }}
                      title="Copy TXID"
                    >
                      <Copy className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Internal Notes + QR upload */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Internal Notes</div>
                <textarea
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  placeholder="Add notes visible only to organisers..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] resize-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>QR Code / Postage Label</div>
                <button className="w-full h-10 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2" style={{ border: `1px dashed rgba(0,0,0,0.2)`, color: "var(--t-muted)" }}>
                  Upload File
                </button>
              </div>

              <div className="border-t border-dashed" style={{ borderColor: V2_CARD_BORDER }} />

              {/* Telegram message */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>Message @{editingOrder.memberUsername}</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={telegramMessage}
                    onChange={(e) => setTelegramMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 h-10 px-3 rounded-lg text-[13px]"
                    style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                  />
                  <button
                    onClick={sendTelegramMessage}
                    disabled={!telegramMessage.trim()}
                    className="h-10 px-4 rounded-lg text-[13px] font-bold text-white flex items-center gap-2 disabled:opacity-40 shrink-0"
                    style={{ background: "#17181A" }}
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </div>

              {/* Flag Order */}
              <div className="rounded-xl p-3" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "#D97706" }}>
                  <Flag className="w-3.5 h-3.5" /> Flag for Follow-up
                </div>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="e.g. Check on this order tomorrow, customer asked about delivery time"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-[13px] resize-none mb-2 bg-white"
                  style={{ border: "1px solid rgba(217,119,6,0.25)", color: "var(--t-text)" }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={flagDueDate}
                    onChange={(e) => setFlagDueDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg text-[12px] bg-white"
                    style={{ border: "1px solid rgba(217,119,6,0.25)", color: "var(--t-text)" }}
                  />
                  <input
                    type="time"
                    value={flagDueTime}
                    onChange={(e) => setFlagDueTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg text-[12px] bg-white"
                    style={{ border: "1px solid rgba(217,119,6,0.25)", color: "var(--t-text)" }}
                  />
                </div>
                {flagNote && (
                  <div className="mt-2 text-[11px] flex items-center gap-1" style={{ color: "#D97706" }}>
                    <Flag className="w-3 h-3" /> This order will be added to your Todo List
                  </div>
                )}
              </div>
            </div>

            {/* Footer: neutral reference action band, matching order cards */}
            <div className="sticky bottom-0 px-4 pt-3 pb-4" style={{ background: "linear-gradient(to top, #F5F5F7 0%, rgba(245,245,247,0.72) 55%, #fff 100%)" }}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[12px] uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Total :</span>
                <span className="text-[20px] font-extrabold" style={{ color: "var(--t-text)" }}>
                  {fmtMoney(editProducts.reduce((sum, p) => sum + p.price * p.quantity, 0), "GBP")}
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={closeEditModal}
                  className="flex-1 h-9 rounded-lg text-[13px] font-bold transition-opacity hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.10)", color: "var(--t-text)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveOrderChanges}
                  className="flex-1 h-9 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#17181A" }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div> {/* Close main content */}
    </div> {/* Close flex container */}

    {/* Payment Proof Image Modal */}
    {viewingProofImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setViewingProofImage(null)}>
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setViewingProofImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "#fff" }}
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingProofImage}
              alt="Payment Proof"
              className="w-full h-auto rounded-lg"
              style={{ maxHeight: "80vh", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCsvImportModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 space-y-4" style={{ border: `1px solid ${V2_CARD_BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Import Tracking Numbers</h3>
              <button onClick={() => setShowCsvImportModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
                <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[13px]" style={{ color: "var(--t-text)" }}>
                Upload a CSV file with two columns: <strong>Order ID, Tracking Number</strong>
              </p>
              <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
                First row can be a header (will be skipped automatically). Orders will be marked as "dispatched".
              </p>
              <div className="rounded-lg p-3 text-[11px] font-mono" style={{ background: "#F3F4F6", color: "#374151" }}>
                Order ID,Tracking Number<br/>
                ORD-001,1Z999AA10123456784<br/>
                ORD-002,1Z999AA10234567895
              </div>
            </div>

            <div className="rounded-lg p-4 space-y-3" style={{ border: `2px dashed ${V2_CARD_BORDER}`, background: "#F9FAFB" }}>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                onClick={() => csvInputRef.current?.click()}
                className="w-full h-10 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff", color: "var(--t-text)" }}
              >
                <Upload className="w-4 h-4" />
                {csvFile ? csvFile.name : "Choose CSV File"}
              </button>
            </div>

            {csvFile && (
              <button
                onClick={handleCsvImport}
                disabled={csvImporting}
                className="w-full h-10 rounded-lg text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--t-blue)" }}
              >
                {csvImporting ? (
                  <><Clock className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import Tracking Numbers</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
