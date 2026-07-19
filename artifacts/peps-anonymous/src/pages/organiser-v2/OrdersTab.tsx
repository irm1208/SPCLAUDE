import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Download, ChevronDown, Package, Clock, CheckCircle2, XCircle, AlertCircle, X, Edit2, Send, Copy, Plus, Minus, Trash2, Flag, Truck, Upload, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { V2_CARD_BORDER } from "./theme";
import { fmtMoney } from "./data";
import { organiserApi } from "./api/organiser-api";
import { useOrderRepository, useOrders } from "./domain/repository-context";
import type { OrganiserOrder as Order, OrderStatus } from "./domain/order";
import {
  cloneOrderFilters,
  countActiveOrderFilterCategories,
  createOrderFilterChips,
  filterOrders,
  validateOrderFilterDates,
  type OrderFilterChipId,
  type OrderFilterValues,
  type OrderSortOrder,
  type OrderStatusFilter,
} from "./orders-filter-model";
import {
  AtlasDataTable,
  AtlasDrawerSection,
  AtlasEmptyState,
  AtlasPerson,
  AtlasQuickViewDrawer,
  AtlasStatusBadge,
  type AtlasColumn,
  type AtlasStatusTone,
} from "./AtlasUi";
import OrdersMobileWorkspace from "./OrdersMobileWorkspace";
import OrdersFilterSurface from "./OrdersFilterSurface";
import { applyMobileOrderAction, buildMobileOrdersModel, type MobileOrderAction, type MobileOrderView } from "./orders-mobile-model";

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

const STATUS_FILTER_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "pending-confirmation", label: "Pending payment confirmation" },
  { value: "ready-dispatch", label: "Ready to dispatch" },
  { value: "completed", label: "Completed" },
] as const satisfies ReadonlyArray<{ value: OrderStatusFilter; label: string }>;

const DEFAULT_FILTER_VALUES: OrderFilterValues = {
  statusFilters: ["all"],
  countryFilters: [],
  paymentMethodFilters: [],
  orderDateFrom: "",
  orderDateTo: "",
  paymentDateFrom: "",
  paymentDateTo: "",
  sortOrder: "newest",
};

function atlasOrderTone(status: OrderStatus): AtlasStatusTone {
  if (status === "pending") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "paid" || status === "delivered") return "success";
  if (status === "processing" || status === "shipped") return "info";
  return "navy";
}

export default function OrdersTab({ selectedGbId, highlightId, onOpenDispatch }: { selectedGbId?: string; highlightId?: string; onOpenDispatch?: () => void } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<OrderStatusFilter[]>(["all"]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [paymentMethodFilters, setPaymentMethodFilters] = useState<string[]>([]);
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<OrderSortOrder>("newest");
  const [filterStudioOpen, setFilterStudioOpen] = useState(false);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileOrderView>("needs-action");
  const [draftFilters, setDraftFilters] = useState<OrderFilterValues>(() => (
    cloneOrderFilters(DEFAULT_FILTER_VALUES)
  ));

  useEffect(() => {
    if (isMobile && filterStudioOpen && mobileView !== "all") {
      setMobileView("all");
    }
  }, [isMobile, filterStudioOpen, mobileView]);

  const orderRepository = useOrderRepository();
  const orders = useOrders();
  const mobileModel = useMemo(() => buildMobileOrdersModel(orders), [orders]);

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

  // Edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [quickViewOrder, setQuickViewOrder] = useState<Order | null>(null);
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
  const uniqueCountries = useMemo(
    () => Array.from(new Set(orders.map(order => order.country))).sort(),
    [orders],
  );
  const uniquePaymentMethods = useMemo(
    () => Array.from(new Set(orders.map(order => order.paymentMethod))).sort(),
    [orders],
  );

  const appliedFilters = useMemo<OrderFilterValues>(() => ({
    statusFilters,
    countryFilters,
    paymentMethodFilters,
    orderDateFrom,
    orderDateTo,
    paymentDateFrom,
    paymentDateTo,
    sortOrder,
  }), [
    statusFilters,
    countryFilters,
    paymentMethodFilters,
    orderDateFrom,
    orderDateTo,
    paymentDateFrom,
    paymentDateTo,
    sortOrder,
  ]);

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
    if (!editingOrder) return;
    orderRepository.replaceOne(
      {
        ...editingOrder,
        status: editStatus as OrderStatus,
        trackingNumber: editTrackingNumber || undefined,
        internalNotes: editInternalNotes || undefined,
        paymentProof: editTxid
          ? { type: editingOrder.paymentProof?.type ?? "txid", value: editTxid }
          : undefined,
        products: editProducts,
        total: editProducts.reduce(
          (total, product) => total + product.quantity * product.price,
          0,
        ),
        flagged: flagNote.trim()
          ? {
              note: flagNote.trim(),
              dueDate: flagDueDate || undefined,
              dueTime: flagDueTime || undefined,
            }
          : undefined,
      },
      {
        type: "order.updated",
        actorId: "organiser",
        summary: `Updated ${editingOrder.id}`,
      },
    );
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
    const targetOrders = selectedOrders.length > 0
      ? selectedOrders
      : filteredOrders.map(order => order.id);
    const price = Number(bulkProductPrice);
    if (!bulkProductName.trim() || !Number.isFinite(price) || price < 0) return;
    const product = {
      name: bulkProductName.trim(),
      quantity: parseInt(bulkProductQuantity, 10) || 1,
      price,
    };
    orderRepository.updateMany(
      targetOrders,
      order => ({
        ...order,
        products: [...order.products, product],
        total: order.total + product.quantity * product.price,
      }),
      {
        type: "order.product_added",
        actorId: "organiser",
        summary: `Added ${product.name} to ${targetOrders.length} orders`,
      },
    );
    setShowBulkAddProduct(false);
    setBulkProductName("");
    setBulkProductQuantity("1");
    setBulkProductPrice("");
    setSelectedOrders([]);
  };

  const bulkAddTask = () => {
    orderRepository.updateMany(
      selectedOrders,
      order => ({
        ...order,
        flagged: {
          note: bulkTaskNote,
          dueDate: bulkTaskDueDate || undefined,
          dueTime: bulkTaskDueTime || undefined,
        },
      }),
      {
        type: "order.task_linked",
        actorId: "organiser",
        summary: `Linked a task to ${selectedOrders.length} orders`,
      },
    );

    const newTodo = {
      id: String(Date.now()),
      title: `Task for ${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""}: ${selectedOrders.join(", ")}`,
      description: bulkTaskNote,
      status: "todo" as const,
      dueDate: bulkTaskDueDate,
      dueTime: bulkTaskDueTime,
      linkedOrderIds: selectedOrders,
      createdAt: new Date().toISOString(),
    };
    if (selectedGbId) {
      organiserApi.createTodo(selectedGbId, newTodo).catch(error => {
        console.error("Failed to create linked todo", error);
      });
    }

    setShowBulkTaskModal(false);
    setBulkTaskNote("");
    setBulkTaskDueDate("");
    setBulkTaskDueTime("");
    setSelectedOrders([]);
  };

  // Additional bulk actions
  const bulkMarkAsPaid = () => {
    const paidAt = new Date().toISOString();
    orderRepository.updateMany(
      selectedOrders,
      order => ({ ...order, status: "paid", paidAt }),
      {
        type: "order.bulk_paid",
        actorId: "organiser",
        summary: `Marked ${selectedOrders.length} orders as paid`,
      },
    );
    setSelectedOrders([]);
  };

  const bulkMarkAsDispatched = () => {
    orderRepository.updateMany(
      selectedOrders,
      order => ({ ...order, status: "dispatched" }),
      {
        type: "order.bulk_dispatched",
        actorId: "organiser",
        summary: `Marked ${selectedOrders.length} orders as dispatched`,
      },
    );
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

      const importedIds = Object.keys(updates).filter(orderId =>
        orders.some(order => order.id === orderId),
      );
      orderRepository.updateMany(
        importedIds,
        order => ({
          ...order,
          trackingNumber: updates[order.id],
          status: "dispatched",
        }),
        {
          type: "order.tracking_imported",
          actorId: "organiser",
          summary: `Imported tracking for ${importedIds.length} orders`,
        },
      );

      setCsvImporting(false);
      setShowCsvImportModal(false);
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
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

  const filteredOrders = useMemo(
    () => filterOrders(orders, appliedFilters, searchQuery),
    [orders, appliedFilters, searchQuery],
  );
  const draftPreviewOrders = useMemo(
    () => filterOrders(orders, draftFilters, searchQuery),
    [orders, draftFilters, searchQuery],
  );
  const draftDateErrors = useMemo(
    () => validateOrderFilterDates(draftFilters),
    [draftFilters],
  );
  const activeFilterCount = countActiveOrderFilterCategories(appliedFilters);
  const applyMobileAction = (action: MobileOrderAction) => {
    const next = applyMobileOrderAction(appliedFilters, action);
    setStatusFilters([...next.statusFilters]);
    setDraftFilters(cloneOrderFilters(next));
    setMobileView("all");
  };
  const appliedFilterChips = createOrderFilterChips(appliedFilters);

  const openFilterStudio = () => {
    setDraftFilters(cloneOrderFilters(appliedFilters));
    setFilterStudioOpen(true);
  };

  const closeFilterStudio = () => {
    setFilterStudioOpen(false);
    window.requestAnimationFrame(() => filterToggleRef.current?.focus());
  };

  const cancelFilterStudio = () => {
    setDraftFilters(cloneOrderFilters(appliedFilters));
    closeFilterStudio();
  };

  const applyDraftFilters = () => {
    if (Object.keys(draftDateErrors).length > 0) return;
    setStatusFilters([...draftFilters.statusFilters]);
    setCountryFilters([...draftFilters.countryFilters]);
    setPaymentMethodFilters([...draftFilters.paymentMethodFilters]);
    setOrderDateFrom(draftFilters.orderDateFrom);
    setOrderDateTo(draftFilters.orderDateTo);
    setPaymentDateFrom(draftFilters.paymentDateFrom);
    setPaymentDateTo(draftFilters.paymentDateTo);
    setSortOrder(draftFilters.sortOrder);
    closeFilterStudio();
  };

  const resetDraftFilters = () => {
    setDraftFilters(current => ({
      ...current,
      statusFilters: ["all"],
      countryFilters: [],
      paymentMethodFilters: [],
      orderDateFrom: "",
      orderDateTo: "",
      paymentDateFrom: "",
      paymentDateTo: "",
      sortOrder,
    }));
  };

  const toggleDraftStatus = (value: OrderStatusFilter) => {
    setDraftFilters(current => {
      const selected = current.statusFilters.filter(status => status !== "all");
      const next = selected.includes(value)
        ? selected.filter(status => status !== value)
        : [...selected, value];
      return { ...current, statusFilters: next.length > 0 ? next : ["all"] };
    });
  };

  const toggleDraftListValue = (
    key: "countryFilters" | "paymentMethodFilters",
    value: string,
  ) => {
    setDraftFilters(current => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter(item => item !== value)
        : [...current[key], value],
    }));
  };

  const handleSortChange = (nextSort: OrderSortOrder) => {
    setSortOrder(nextSort);
    if (filterStudioOpen) {
      setDraftFilters(current => ({ ...current, sortOrder: nextSort }));
    }
  };

  const clearAppliedFilter = (chipId: OrderFilterChipId) => {
    if (chipId === "status") {
      setStatusFilters(["all"]);
      setDraftFilters(current => ({ ...current, statusFilters: ["all"] }));
    } else if (chipId === "country") {
      setCountryFilters([]);
      setDraftFilters(current => ({ ...current, countryFilters: [] }));
    } else if (chipId === "payment") {
      setPaymentMethodFilters([]);
      setDraftFilters(current => ({ ...current, paymentMethodFilters: [] }));
    } else if (chipId === "order-date") {
      setOrderDateFrom("");
      setOrderDateTo("");
      setDraftFilters(current => ({ ...current, orderDateFrom: "", orderDateTo: "" }));
    } else {
      setPaymentDateFrom("");
      setPaymentDateTo("");
      setDraftFilters(current => ({ ...current, paymentDateFrom: "", paymentDateTo: "" }));
    }
  };

  const clearAllAppliedFilters = () => {
    setStatusFilters(["all"]);
    setCountryFilters([]);
    setPaymentMethodFilters([]);
    setOrderDateFrom("");
    setOrderDateTo("");
    setPaymentDateFrom("");
    setPaymentDateTo("");
    setDraftFilters(current => ({
      ...current,
      statusFilters: ["all"],
      countryFilters: [],
      paymentMethodFilters: [],
      orderDateFrom: "",
      orderDateTo: "",
      paymentDateFrom: "",
      paymentDateTo: "",
    }));
  };

  const orderColumns: AtlasColumn<Order>[] = [
    {
      id: "member",
      label: "Member",
      width: "20%",
      render: order => <AtlasPerson name={order.memberName} username={order.memberUsername} />,
    },
    {
      id: "status",
      label: "Status",
      width: "20%",
      render: order => <AtlasStatusBadge tone={order.status === "pending" ? "warning" : order.status === "cancelled" ? "danger" : order.status === "dispatched" || order.status === "delivered" ? "success" : "info"}>{STATUS_CONFIG[order.status].label}</AtlasStatusBadge>,
    },
    { id: "items", label: "Items", width: "21%", render: order => <span className="atlas-muted-cell">{order.products.map(product => `${product.name} × ${product.quantity}`).join(", ") || "No products"}</span> },
    { id: "total", label: "Total", width: "9%", align: "right", render: order => <strong>{fmtMoney(order.total, "GBP")}</strong> },
    { id: "payment", label: "Payment", width: "12%", render: order => <span className="atlas-muted-cell">{order.paymentMethod}</span> },
    { id: "created", label: "Created", width: "11%", align: "right", render: order => <span className="atlas-muted-cell">{new Date(order.createdAt).toLocaleDateString("en-GB")}</span> },
  ];

  return (
    <div className="approved-order-desk">
      <div className="orders-mobile-view">
        <OrdersMobileWorkspace
          model={mobileModel}
          orders={mobileView === "all" ? filteredOrders : orders}
          view={mobileView}
          searchQuery={searchQuery}
          activeFilterCount={activeFilterCount}
          filterButtonRef={isMobile ? filterToggleRef : undefined}
          onViewChange={setMobileView}
          onSearchChange={setSearchQuery}
          onOpenFilters={openFilterStudio}
          onChasePayments={() => applyMobileAction("chase-payment")}
          onOpenDispatch={onOpenDispatch ?? (() => undefined)}
          onOpenOrder={setQuickViewOrder}
        />
      </div>
      <div className="orders-desktop-view">
      {/* Main content */}
      <div className="orders-main-content space-y-4">
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
      <section className="orders-filter-workspace" aria-label="Order filters">
        <div className="orders-filter-toolbar">
          <label className="orders-filter-search">
            <span className="sr-only">Search orders</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search member, order ID, username or TXID…"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </label>

          <button
            ref={!isMobile ? filterToggleRef : undefined}
            type="button"
            className="orders-filter-toggle"
            aria-expanded={filterStudioOpen}
            aria-controls="orders-filter-studio"
            onClick={filterStudioOpen ? cancelFilterStudio : openFilterStudio}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span>Filters</span>
            {activeFilterCount > 0 ? (
              <span
                className="orders-filter-count"
                aria-label={`${activeFilterCount} filter categories applied`}
              >
                {activeFilterCount}
              </span>
            ) : null}
            <ChevronDown className="orders-filter-chevron" aria-hidden="true" />
          </button>

          <label className="orders-sort-control">
            <span className="sr-only">Sort orders</span>
            <select
              value={sortOrder}
              onChange={event => handleSortChange(event.target.value as OrderSortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
        </div>

        {appliedFilterChips.length > 0 ? (
          <div className="orders-applied-filters" aria-label="Applied filters">
            <div className="orders-filter-chip-list">
              {appliedFilterChips.map(chip => (
                <button
                  type="button"
                  key={chip.id}
                  className="orders-filter-chip"
                  onClick={() => clearAppliedFilter(chip.id)}
                  aria-label={`Remove ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <X aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                className="orders-clear-filters"
                onClick={clearAllAppliedFilters}
              >
                Clear all
              </button>
            </div>
            <span className="orders-filter-result-copy">
              <strong>{filteredOrders.length}</strong> matching orders
            </span>
          </div>
        ) : null}

        <OrdersFilterSurface
          open={filterStudioOpen}
          mobile={isMobile}
          onOpenChange={open => {
            if (!open) closeFilterStudio();
          }}
        >
            <header className="orders-filter-studio-header">
              <div>
                <span className="orders-filter-kicker">Refine orders</span>
                <h3>Filter Studio</h3>
                <p>Review your choices, then apply them to the order table.</p>
              </div>
              <span className="orders-filter-preview" aria-live="polite">
                <strong>{draftPreviewOrders.length}</strong> orders match this draft
              </span>
            </header>

            <div className="orders-filter-studio-grid">
              <fieldset className="orders-filter-group">
                <legend>Status</legend>
                <div className="orders-filter-choice-list">
                  {STATUS_FILTER_OPTIONS.map(option => (
                    <label className="orders-filter-choice" key={option.value}>
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={
                          !draftFilters.statusFilters.includes("all")
                          && draftFilters.statusFilters.includes(option.value)
                        }
                        onChange={() => toggleDraftStatus(option.value)}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="orders-filter-group">
                <legend>Country</legend>
                <div className="orders-filter-choice-list orders-filter-scroll-list">
                  {uniqueCountries.length > 0 ? uniqueCountries.map(country => (
                    <label className="orders-filter-choice" key={country}>
                      <span>{country}</span>
                      <input
                        type="checkbox"
                        checked={draftFilters.countryFilters.includes(country)}
                        onChange={() => toggleDraftListValue("countryFilters", country)}
                      />
                    </label>
                  )) : <span className="orders-filter-empty-choice">No countries available</span>}
                </div>
              </fieldset>

              <fieldset className="orders-filter-group">
                <legend>Payment method</legend>
                <div className="orders-filter-choice-list orders-filter-scroll-list">
                  {uniquePaymentMethods.length > 0 ? uniquePaymentMethods.map(method => (
                    <label className="orders-filter-choice" key={method}>
                      <span>{method}</span>
                      <input
                        type="checkbox"
                        checked={draftFilters.paymentMethodFilters.includes(method)}
                        onChange={() => toggleDraftListValue("paymentMethodFilters", method)}
                      />
                    </label>
                  )) : <span className="orders-filter-empty-choice">No payment methods available</span>}
                </div>
              </fieldset>

              <fieldset className="orders-filter-group orders-filter-date-group">
                <legend>Dates and sort</legend>
                <div className="orders-filter-date-section">
                  <span>Order date</span>
                  <div className="orders-filter-date-pair">
                    <label>
                      <span>From</span>
                      <input
                        type="date"
                        value={draftFilters.orderDateFrom}
                        onChange={event => setDraftFilters(current => ({
                          ...current,
                          orderDateFrom: event.target.value,
                        }))}
                      />
                    </label>
                    <label>
                      <span>To</span>
                      <input
                        type="date"
                        value={draftFilters.orderDateTo}
                        onChange={event => setDraftFilters(current => ({
                          ...current,
                          orderDateTo: event.target.value,
                        }))}
                      />
                    </label>
                  </div>
                  {draftDateErrors.orderDate ? (
                    <p className="orders-filter-error" role="alert">{draftDateErrors.orderDate}</p>
                  ) : null}
                </div>

                <div className="orders-filter-date-section">
                  <span>Payment date</span>
                  <div className="orders-filter-date-pair">
                    <label>
                      <span>From</span>
                      <input
                        type="date"
                        value={draftFilters.paymentDateFrom}
                        onChange={event => setDraftFilters(current => ({
                          ...current,
                          paymentDateFrom: event.target.value,
                        }))}
                      />
                    </label>
                    <label>
                      <span>To</span>
                      <input
                        type="date"
                        value={draftFilters.paymentDateTo}
                        onChange={event => setDraftFilters(current => ({
                          ...current,
                          paymentDateTo: event.target.value,
                        }))}
                      />
                    </label>
                  </div>
                  {draftDateErrors.paymentDate ? (
                    <p className="orders-filter-error" role="alert">{draftDateErrors.paymentDate}</p>
                  ) : null}
                </div>

                <label className="orders-filter-draft-sort">
                  <span>Sort order</span>
                  <select
                    value={draftFilters.sortOrder}
                    onChange={event => setDraftFilters(current => ({
                      ...current,
                      sortOrder: event.target.value as OrderSortOrder,
                    }))}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
              </fieldset>
            </div>

            <footer className="orders-filter-studio-footer">
              <button type="button" className="orders-filter-reset" onClick={resetDraftFilters}>Reset</button>
              <div>
                <button type="button" className="orders-filter-cancel" onClick={cancelFilterStudio}>Cancel</button>
                <button
                  type="button"
                  className="orders-filter-apply"
                  onClick={applyDraftFilters}
                  disabled={Object.keys(draftDateErrors).length > 0}
                >
                  Apply filters · {draftPreviewOrders.length} orders
                </button>
              </div>
            </footer>
        </OrdersFilterSurface>
      </section>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="atlas-legacy-order-empty rounded-xl p-12 text-center bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>No orders found</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="atlas-legacy-order-select-all flex items-center gap-2 px-4 py-2 rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
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

          <div className="atlas-legacy-order-cards space-y-4">
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

      <section className="atlas-card atlas-orders-table-card" aria-labelledby="atlas-orders-table-title">
        <div className="atlas-card-heading">
          <div><span className="atlas-eyebrow">Operational queue</span><h2 id="atlas-orders-table-title">All orders</h2></div>
          <span className="atlas-result-count">{filteredOrders.length} of {orders.length}</span>
        </div>
        <AtlasDataTable
          label="Group-buy orders"
          rows={filteredOrders}
          columns={orderColumns}
          rowKey={order => order.id}
          onRowClick={order => setQuickViewOrder(order)}
          selected={selectedOrders}
          onSelect={setSelectedOrders}
          empty={<AtlasEmptyState title="No orders found" description="Try adjusting your filters." />}
        />
      </section>

      </div>
      </div>

      <AtlasQuickViewDrawer
        open={Boolean(quickViewOrder)}
        onClose={() => setQuickViewOrder(null)}
        eyebrow="Order quick view"
        title={quickViewOrder?.id ?? "Order"}
        subtitle={quickViewOrder ? <AtlasPerson name={quickViewOrder.memberName} username={quickViewOrder.memberUsername} compact /> : undefined}
        footer={quickViewOrder ? <div className="atlas-drawer-actions"><button type="button" className="atlas-secondary-button" onClick={() => { openEditModal(quickViewOrder); setQuickViewOrder(null); }}><Edit2 aria-hidden="true" /> Edit order</button><button type="button" className="atlas-primary-button" onClick={() => { toggleOrderSelection(quickViewOrder.id); setQuickViewOrder(null); }}>Select order</button></div> : undefined}
      >
        {quickViewOrder ? (
          <>
            <div className="atlas-drawer-summary"><AtlasStatusBadge tone={quickViewOrder.status === "pending" ? "warning" : quickViewOrder.status === "cancelled" ? "danger" : "success"}>{STATUS_CONFIG[quickViewOrder.status].label}</AtlasStatusBadge><strong>{fmtMoney(quickViewOrder.total, "GBP")}</strong><span>{quickViewOrder.paymentMethod} · {quickViewOrder.country}</span></div>
            <AtlasDrawerSection title="Items"><div className="atlas-order-history">{quickViewOrder.products.map(product => <article key={product.name}><div><strong>{product.name}</strong><small>Quantity {product.quantity}</small></div><strong>{fmtMoney(product.price * product.quantity, "GBP")}</strong></article>)}</div></AtlasDrawerSection>
            <AtlasDrawerSection title="Delivery"><dl className="atlas-detail-list"><div><dt>Shipping</dt><dd>{quickViewOrder.shippingOption}</dd></div><div><dt>Country</dt><dd>{quickViewOrder.country}</dd></div><div><dt>Tracking</dt><dd>{quickViewOrder.trackingNumber ?? "Not assigned"}</dd></div><div><dt>Created</dt><dd>{new Date(quickViewOrder.createdAt).toLocaleDateString("en-GB")}</dd></div></dl></AtlasDrawerSection>
            {quickViewOrder.internalNotes || quickViewOrder.flagged ? <AtlasDrawerSection title="Notes"><p className="atlas-drawer-note">{quickViewOrder.flagged?.note ?? quickViewOrder.internalNotes}</p></AtlasDrawerSection> : null}
          </>
        ) : null}
      </AtlasQuickViewDrawer>

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
    </div>
  );
}
