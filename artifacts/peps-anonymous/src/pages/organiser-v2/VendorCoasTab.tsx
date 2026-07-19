import { useState, useEffect, useRef } from "react";
import { V2_CARD_BORDER } from "./theme";
import { loadGb, saveGb } from "./storage";
import {
  FileCheck, Loader2, Trash2, Check, CheckCircle2, X,
  Upload, ExternalLink, Sparkles, ChevronDown, ChevronRight,
  Lightbulb, FileText, Building2, Calendar, Search, Filter,
  Download, TrendingUp, TrendingDown, Package
} from "lucide-react";
import gsap from "gsap";

// ─── Workspace: Vendor COAs Tab ──────────────────────────────────────────────
// Certificate of Analysis management from vendors. Displays COAs in a modern
// dashboard-style table with stats cards, search/filter, and GSAP animations.

interface VendorCoa {
  id: number;
  vendorName: string;
  productName: string;
  batchNumber: string;
  testDate: string;
  coaUrl: string;
  purityPercent: number;
  status: "approved" | "pending" | "rejected";
  uploadedAt: string;
  notes?: string;
}

interface Props {
  selectedGbId: string | null;
}

export default function VendorCoasTab({ selectedGbId }: Props) {
  const [coas, setCoas] = useState<VendorCoa[]>([]);
  const [mode, setMode] = useState<"none" | "upload" | "bulk">("none");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "rejected">("all");

  // New COA form
  const [newCoa, setNewCoa] = useState<Partial<VendorCoa>>({
    vendorName: "",
    productName: "",
    batchNumber: "",
    testDate: "",
    coaUrl: "",
    purityPercent: 0,
    status: "pending",
    notes: "",
  });

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statsRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load COAs from localStorage
  useEffect(() => {
    if (!selectedGbId) return;
    setCoas(loadGb<VendorCoa[]>(selectedGbId, "vendorCoas", []));
  }, [selectedGbId]);

  // Save COAs to localStorage
  const saveCoas = (updatedCoas: VendorCoa[]) => {
    if (!selectedGbId) return;
    saveGb(selectedGbId, "vendorCoas", updatedCoas);
    setCoas(updatedCoas);
  };

  // GSAP: Animate cards on mount
  useEffect(() => {
    if (coas.length > 0 && cardRefs.current.length > 0) {
      gsap.fromTo(
        cardRefs.current.filter(Boolean),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out",
        }
      );
    }
  }, [coas]);

  // GSAP: Animate stats cards
  useEffect(() => {
    if (statsRefs.current.length > 0) {
      gsap.fromTo(
        statsRefs.current.filter(Boolean),
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.4)",
        }
      );
    }
  }, []);

  // Calculate stats
  const totalCoas = coas.length;
  const approvedCoas = coas.filter((c) => c.status === "approved").length;
  const pendingCoas = coas.filter((c) => c.status === "pending").length;
  const avgPurity = coas.length > 0
    ? (coas.reduce((sum, c) => sum + c.purityPercent, 0) / coas.length).toFixed(1)
    : "0";

  // Filter COAs
  const filteredCoas = coas.filter((coa) => {
    const matchesSearch =
      coa.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coa.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coa.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || coa.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Upload new COA
  const handleUpload = () => {
    if (!newCoa.vendorName || !newCoa.productName || !newCoa.coaUrl) {
      alert("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setTimeout(() => {
      const coaToAdd: VendorCoa = {
        id: Date.now(),
        vendorName: newCoa.vendorName!,
        productName: newCoa.productName!,
        batchNumber: newCoa.batchNumber || "N/A",
        testDate: newCoa.testDate || new Date().toISOString().split("T")[0],
        coaUrl: newCoa.coaUrl!,
        purityPercent: newCoa.purityPercent || 0,
        status: newCoa.status as "approved" | "pending" | "rejected",
        uploadedAt: new Date().toISOString(),
        notes: newCoa.notes,
      };

      saveCoas([...coas, coaToAdd]);
      setNewCoa({
        vendorName: "",
        productName: "",
        batchNumber: "",
        testDate: "",
        coaUrl: "",
        purityPercent: 0,
        status: "pending",
        notes: "",
      });
      setMode("none");
      setUploading(false);
    }, 800);
  };

  // Delete COA
  const handleDelete = (id: number) => {
    if (confirm("Delete this COA?")) {
      saveCoas(coas.filter((c) => c.id !== id));
    }
  };

  // Update COA status
  const updateStatus = (id: number, status: "approved" | "pending" | "rejected") => {
    saveCoas(coas.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
            Vendor COAs
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
            Certificates of Analysis from your suppliers
          </p>
        </div>
        <button
          onClick={() => setMode(mode === "upload" ? "none" : "upload")}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ background: "var(--t-blue)", color: "#fff" }}
        >
          <Upload className="w-4 h-4" />
          Upload COA
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total COAs",
            value: totalCoas,
            icon: FileCheck,
            color: "#3B82F6",
            bgColor: "#EFF6FF",
          },
          {
            label: "Approved",
            value: approvedCoas,
            icon: CheckCircle2,
            color: "#16A34A",
            bgColor: "#F0FDF4",
          },
          {
            label: "Pending Review",
            value: pendingCoas,
            icon: Loader2,
            color: "#F59E0B",
            bgColor: "#FEF3C7",
          },
          {
            label: "Avg Purity",
            value: `${avgPurity}%`,
            icon: TrendingUp,
            color: "#8B5CF6",
            bgColor: "#F5F3FF",
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              ref={(el) => { statsRefs.current[idx] = el; }}
              className="rounded-xl p-4 bg-white"
              style={{ border: `1px solid ${V2_CARD_BORDER}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium" style={{ color: "var(--t-subtle)" }}>
                  {stat.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: stat.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Form */}
      {mode === "upload" && (
        <div className="rounded-xl p-5 bg-white space-y-4" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>
              Upload New COA
            </h3>
            <button
              onClick={() => setMode("none")}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
            >
              <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Vendor Name *
              </label>
              <input
                type="text"
                value={newCoa.vendorName || ""}
                onChange={(e) => setNewCoa({ ...newCoa, vendorName: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                placeholder="e.g. QSC Labs"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Product Name *
              </label>
              <input
                type="text"
                value={newCoa.productName || ""}
                onChange={(e) => setNewCoa({ ...newCoa, productName: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                placeholder="e.g. Semaglutide"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Batch Number
              </label>
              <input
                type="text"
                value={newCoa.batchNumber || ""}
                onChange={(e) => setNewCoa({ ...newCoa, batchNumber: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                placeholder="e.g. BATCH-2024-001"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Test Date
              </label>
              <input
                type="date"
                value={newCoa.testDate || ""}
                onChange={(e) => setNewCoa({ ...newCoa, testDate: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Purity (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newCoa.purityPercent || ""}
                onChange={(e) => setNewCoa({ ...newCoa, purityPercent: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                placeholder="99.5"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
                Status
              </label>
              <select
                value={newCoa.status || "pending"}
                onChange={(e) => setNewCoa({ ...newCoa, status: e.target.value as any })}
                className="w-full h-9 px-3 rounded-lg text-[13px]"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
              COA URL *
            </label>
            <input
              type="url"
              value={newCoa.coaUrl || ""}
              onChange={(e) => setNewCoa({ ...newCoa, coaUrl: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-[13px]"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              placeholder="https://example.com/coa.pdf"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--t-text)" }}>
              Notes (Optional)
            </label>
            <textarea
              value={newCoa.notes || ""}
              onChange={(e) => setNewCoa({ ...newCoa, notes: e.target.value })}
              className="w-full h-20 px-3 py-2 rounded-lg text-[13px] resize-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
              placeholder="Additional notes about this COA..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 h-9 rounded-lg text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--t-blue)" }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload COA
                </>
              )}
            </button>
            <button
              onClick={() => setMode("none")}
              className="flex-1 h-9 rounded-lg text-[13px] font-bold"
              style={{ background: "rgba(0,0,0,0.05)", color: "var(--t-text)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      {coas.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--t-subtle)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor, product, or batch..."
              className="w-full h-10 pl-10 pr-3 rounded-lg text-[13px]"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "approved", "pending", "rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className="h-10 px-4 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  background: filterStatus === status ? "var(--t-blue)" : "#fff",
                  color: filterStatus === status ? "#fff" : "var(--t-text)",
                  border: `1px solid ${filterStatus === status ? "var(--t-blue)" : V2_CARD_BORDER}`,
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COA Table */}
      {filteredCoas.length > 0 && (
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: V2_CARD_BORDER }}>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Vendor
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Product
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Batch
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Purity
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Test Date
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCoas.map((coa, idx) => (
                  <tr
                    key={coa.id}
                    ref={(el) => { cardRefs.current[idx] = el; }}
                    className="border-b hover:bg-gray-50 transition-colors"
                    style={{ borderColor: V2_CARD_BORDER }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: "var(--t-blue-10)" }}
                        >
                          <Building2 className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>
                          {coa.vendorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--t-text)" }}>
                      {coa.productName}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-mono" style={{ color: "var(--t-subtle)" }}>
                      {coa.batchNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold"
                        style={{
                          background: coa.purityPercent >= 99 ? "#F0FDF4" : "#FEF3C7",
                          color: coa.purityPercent >= 99 ? "#16A34A" : "#F59E0B",
                        }}
                      >
                        {coa.purityPercent >= 99 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {coa.purityPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--t-subtle)" }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {coa.testDate}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={coa.status}
                        onChange={(e) => updateStatus(coa.id, e.target.value as any)}
                        className="px-2 py-1 rounded text-[12px] font-semibold"
                        style={{
                          background:
                            coa.status === "approved"
                              ? "#F0FDF4"
                              : coa.status === "pending"
                              ? "#FEF3C7"
                              : "#FEE2E2",
                          color:
                            coa.status === "approved"
                              ? "#16A34A"
                              : coa.status === "pending"
                              ? "#F59E0B"
                              : "#DC2626",
                          border: "none",
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={coa.coaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                          title="View COA"
                        >
                          <ExternalLink className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                        </a>
                        <button
                          onClick={() => handleDelete(coa.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Delete COA"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: "#DC2626" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {coas.length === 0 && mode === "none" && (
        <div className="rounded-xl p-8 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <FileCheck className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
            No COAs Yet
          </h3>
          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
            Upload your first Certificate of Analysis from a vendor
          </p>
        </div>
      )}

      {/* No Results */}
      {filteredCoas.length === 0 && coas.length > 0 && (
        <div className="rounded-xl p-8 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <Search className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
            No Results Found
          </h3>
          <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
