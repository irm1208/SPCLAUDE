import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  PieChart,
  Package,
  Archive,
  Tag,
  ChevronDown,
} from "lucide-react";

const BRAND = "#2D6BCC";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: ShoppingCart,    label: "Order",     active: true },
  { icon: PieChart,        label: "Statistic" },
  { icon: Package,         label: "Product" },
  { icon: Archive,         label: "Stock" },
  { icon: Tag,             label: "Offer" },
];

const TABS = ["All orders", "Dispatch", "Pending", "Completed"];

const ORDERS = [
  { id: "#PA001", name: "Brooklyn Zoe",   address: "302 Snider Street",    city: "RUTLAND, VT, 05701",    seed: "brooklyn" },
  { id: "#PA002", name: "John McCormick", address: "1096 Wiseman Street",  city: "CALMAR, IA, 52132",     seed: "john",     selected: true },
  { id: "#PA003", name: "Sandra Pugh",    address: "1640 Thorn Street",    city: "SALE CITY, GA, 98106",  seed: "sandra" },
  { id: "#PA004", name: "Vernie Hart",    address: "3898 Oak Drive",       city: "DOVER, DE, 19906",      seed: "vernie" },
  { id: "#PA005", name: "Mark Clark",     address: "1915 Augusta Park",    city: "NASSAU, NY, 12062",     seed: "mark" },
  { id: "#PA006", name: "Rebekah Foster", address: "3445 Park Boulevard",  city: "BIOLA, CA, 93606",      seed: "rebekah" },
];

export function OrderPage() {
  const [activeTab, setActiveTab] = useState("All orders");
  const [selectedId, setSelectedId] = useState("#PA002");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#F1F5FB" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 272,
        minWidth: 272,
        background: BRAND,
        display: "flex",
        flexDirection: "column",
        paddingTop: 36,
        position: "relative",
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Peps Anonymous
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(({ icon: Icon, label, active }) => {
            const isActive = active;
            return (
              <div key={label} style={{ position: "relative", marginBottom: 4 }}>
                {isActive && (
                  <>
                    {/* concave cutout above */}
                    <div style={{
                      position: "absolute",
                      right: 0,
                      bottom: "100%",
                      width: 24,
                      height: 24,
                      background: "#fff",
                      borderBottomRightRadius: 16,
                      boxShadow: `8px 8px 0 8px ${BRAND}`,
                    }} />
                    {/* concave cutout below */}
                    <div style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      width: 24,
                      height: 24,
                      background: "#fff",
                      borderTopRightRadius: 16,
                      boxShadow: `8px -8px 0 8px ${BRAND}`,
                    }} />
                  </>
                )}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 24px",
                  marginLeft: isActive ? 16 : 0,
                  borderRadius: isActive ? "20px 0 0 20px" : 0,
                  background: isActive ? "#fff" : "transparent",
                  cursor: "pointer",
                }}>
                  <Icon
                    size={20}
                    style={{ color: isActive ? BRAND : "rgba(255,255,255,0.75)", flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: isActive ? BRAND : "rgba(255,255,255,0.9)",
                  }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "24px 0", marginBottom: 8 }}>
          {["Facebook", "Twitter", "Google"].map(s => (
            <span key={s} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", cursor: "pointer", textDecoration: "underline" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "48px 48px 32px" }}>

          {/* Heading */}
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", margin: 0, lineHeight: 1.1 }}>
            Order
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, marginBottom: 32 }}>
            {ORDERS.length * 4 + 4} orders found
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 32, borderBottom: "1px solid #E2E8F0", marginBottom: 28 }}>
            {TABS.map(tab => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0 12px",
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "#0F172A" : "#94A3B8",
                    borderBottom: isActive ? `2px solid ${BRAND}` : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 1fr",
            padding: "0 20px",
            marginBottom: 10,
          }}>
            {["Id", "Name", "Address"].map((h, i) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>{h}</span>
                {i === 0 && <ChevronDown size={14} style={{ color: "#94A3B8" }} />}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ORDERS.map(order => {
              const isSelected = order.id === selectedId;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 1fr",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: isSelected ? BRAND : "#ffffff",
                    border: isSelected ? "none" : "1px solid #E8EEF5",
                    boxShadow: isSelected ? `0 4px 16px rgba(45,107,204,0.25)` : "0 1px 4px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* ID */}
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isSelected ? "rgba(255,255,255,0.9)" : "#475569",
                  }}>
                    {order.id}
                  </span>

                  {/* Name + Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.seed}&backgroundColor=${isSelected ? "b6e3f4" : "c0aede"}`}
                      alt={order.name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: isSelected ? "rgba(255,255,255,0.2)" : "#EEF2FF",
                        flexShrink: 0,
                        border: isSelected ? "2px solid rgba(255,255,255,0.3)" : "2px solid #E0E7FF",
                      }}
                    />
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isSelected ? "#ffffff" : "#1E293B",
                    }}>
                      {order.name}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: isSelected ? "rgba(255,255,255,0.9)" : "#1E293B",
                    }}>
                      {order.address},{" "}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: isSelected ? "rgba(255,255,255,0.65)" : "#94A3B8",
                    }}>
                      {order.city}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination footer */}
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 24, textAlign: "left" }}>
            Showing 01–06 of 28
          </p>
        </div>
      </div>
    </div>
  );
}
