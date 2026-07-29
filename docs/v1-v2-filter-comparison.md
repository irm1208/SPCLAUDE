# 🔍 GB Organizer v1 vs v2 - Filter Comparison

**Analysis Date**: 2026-07-12  
**Status**: Complete filter audit

---

## 📊 Executive Summary

### Overall Status:
- ✅ **v2 is BETTER** for: Orders, Parcels
- 🟰 **v2 is EQUAL** for: Dispatch (reuses v1)
- ❌ **v2 is MISSING**: Entire Fulfilment/Routing board, Ticket filters

### Critical Gap:
**The entire Fulfilment/Routing board from v1 (AdminGbFulfilment) is not in v2.** This is a major workflow gap for organizers.

---

## 📋 Complete Filter Comparison

| Filter Name | V1 Location | V2 Status | V2 Location | Priority to Add |
|-------------|-------------|-----------|-------------|-----------------|
| **DISPATCH TAB** | | | | |
| GB Selector | AdminDispatch | ✅ Exists | DispatchTab | N/A (already exists) |
| Scope Type Filter (Reshipper/Country/All) | AdminDispatch | ✅ Exists | Reuses v1 component | N/A (already exists) |
| Scope ID Selector | AdminDispatch | ✅ Exists | Reuses v1 component | N/A (already exists) |
| Parcel Selection | AdminDispatch | ✅ Exists | Reuses v1 component | N/A (already exists) |
| **FULFILLMENT/ROUTING TAB** | | | | |
| Search by username/code/TXID | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Route Type Filter | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Payment Status Filter | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Country Filter | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Flags Filter | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Group By View | AdminGbFulfilment | ❌ **MISSING** | N/A | 🔴 **P0 - Critical** |
| Board vs List View | AdminGbFulfilment | ❌ **MISSING** | N/A | 🟡 P1 - High |
| **TICKETS TAB** | | | | |
| Search tickets | AdminTicketsTab | ✅ Exists | TicketsTab | N/A (already exists) |
| Status Filter | AdminTicketsTab | ⚠️ **Partial** | TicketsTab (count only) | 🟡 P1 - High |
| Category Filter | AdminTicketsTab | ❌ **MISSING** | N/A | 🟡 P1 - High |
| **ORDERS TAB** | | | | |
| Search | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| Status Filter | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| Country Filter | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| Payment Method Filter | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| Date Range Filters | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| Sort Order | v1 lacks this | ✅ **Better in v2** | OrdersTab | N/A (v2 superior) |
| **PARCELS TAB** | | | | |
| Search parcels | v1 lacks this | ✅ **New in v2** | ParcelsTab | N/A (v2 superior) |
| Status Filter | v1 lacks this | ✅ **New in v2** | ParcelsTab | N/A (v2 superior) |

---

## 🔴 Critical Missing: Fulfilment/Routing Board

### What's Missing:
The entire **AdminGbFulfilment** component is not ported to v2. This is a **major workflow component** that v1 organizers rely on daily.

### What it does:
- **Central routing board** for assigning orders to reshippers or marking as direct ship
- **Kanban-style workflow** with drag-and-drop (or list view)
- **Advanced filtering** for finding specific orders quickly
- **Batch routing operations** (assign 50 orders to a reshipper in one click)
- **Payment tracking** integrated with routing decisions
- **Flag management** for problematic orders

### Filters in Fulfilment Board (ALL missing in v2):

#### 1. **Search Filter**
```
Input: Search by username, member code, or TXID
Location: Top of board
Use case: "Find user @john_doe's order"
```

#### 2. **Route Type Filter** (Multi-select)
```
Options:
- Direct Ship (no reshipper)
- Via Reshipper (has reshipper assigned)
- Unrouted (not yet assigned)
- Legacy (old routing system)

Use case: "Show me all unrouted orders so I can assign them"
```

#### 3. **Payment Status Filter** (Multi-select)
```
Options:
- Paid (payment confirmed)
- Submitted (payment proof submitted, awaiting confirmation)
- Unpaid (no payment yet)

Use case: "Show only paid orders ready for dispatch"
```

#### 4. **Country Filter** (Dropdown)
```
Options: List of all destination countries
Use case: "Show all UK orders to batch them together"
```

#### 5. **Flags Filter** (Multi-select)
```
Options:
- Balance Due (customer owes money)
- No Address (missing shipping info)
- Locked (order frozen, no edits allowed)

Use case: "Show me all orders with balance due to chase payment"
```

#### 6. **Group By View** (Toggle)
```
Options:
- Group by Reshipper (Kanban columns per reshipper)
- Group by Country Leg (Kanban columns per shipping route)

Use case: "View all orders grouped by which reshipper handles them"
```

#### 7. **Board vs List View** (Toggle)
```
Options:
- Board View (Kanban-style drag-and-drop cards)
- List View (Table with all order details)

Use case: Desktop users prefer board, mobile users prefer list
```

---

## ⚠️ Partial Implementation: Tickets Tab

### What exists in v2:
- ✅ Search by username/subject
- ✅ Status counts shown in stat tiles (Open: 5, In Progress: 2, Resolved: 8, Closed: 12)

### What's missing in v2:
- ❌ **Status filter buttons** - Can see counts but can't click to filter
- ❌ **Category filter** - v1 has Order Issue, General, GB, Wholesale, Testing categories

### How v1 does it:
```tsx
// Status filter buttons
{["open", "in_progress", "resolved", "closed"].map(status => (
  <button 
    onClick={() => setStatusFilter(status)}
    className={statusFilter === status ? "active" : ""}
  >
    {capitalize(status)} ({counts[status]})
  </button>
))}

// Category filter
<select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
  <option value="">All Categories</option>
  <option value="order_issue">Order Issue</option>
  <option value="general">General Question</option>
  <option value="gb">Group Buy</option>
  <option value="wholesale">Wholesale</option>
  <option value="testing">Testing Contribution</option>
</select>
```

### How v2 should add it:
Make the status stat tiles **clickable** to filter:
```tsx
<StatTile 
  icon={AlertCircle} 
  tile={TILE.red} 
  value={openCount} 
  label="Open" 
  onClick={() => setStatusFilter("open")}  // <-- ADD THIS
  isActive={statusFilter === "open"}       // <-- AND THIS
/>
```

Add category dropdown next to search:
```tsx
<select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
  <option value="">All Categories</option>
  {categories.map(cat => <option value={cat.id}>{cat.name}</option>)}
</select>
```

---

## ✅ Where v2 is Better

### Orders Tab - v2 is MORE advanced:
v1 admin panel has **no dedicated orders view** with filters. v2 adds:

1. **Advanced Search** - username, member name, order ID, TXID
2. **Status Filter** - Multi-select checkboxes (Paid, Pending, Cancelled)
3. **Country Filter** - Multi-select destination countries
4. **Payment Method Filter** - Multi-select (USDT, Revolut, Wise, etc.)
5. **Order Date Range** - From/To date pickers
6. **Payment Date Range** - From/To date pickers for payment confirmation
7. **Sort Order** - Newest first / Oldest first toggle

**Result**: v2 Orders tab is **significantly better** than v1.

### Parcels Tab - New in v2:
v1 has no dedicated parcels tracking tab. v2 adds:

1. **Search** - Find by tracking number, member, order ID
2. **Status Filter** - In Transit, Out for Delivery, Delivered, Exception
3. **Tracking integration** - Live updates from shipping providers

**Result**: v2 Parcels tab is a **new feature** not in v1.

---

## 🎯 Action Plan: Achieving Feature Parity

### Priority 0 - Critical (Blockers for v2 Launch):

**1. Port AdminGbFulfilment to v2** (10-15 hours)
- Create new `FulfilmentTab.tsx` component
- Implement all 7 filters:
  - Search (username/code/TXID)
  - Route type multi-select
  - Payment status multi-select
  - Country dropdown
  - Flags multi-select
  - Group by toggle (Reshipper/Country Leg)
  - Board vs List view toggle
- Kanban board UI or start with list view
- Batch routing operations

**Estimated effort**: 10-15 hours (complex component)  
**Impact**: Unblocks critical routing workflow

---

### Priority 1 - High (Should Have):

**2. Make Ticket Status Tiles Clickable** (1 hour)
- Add `onClick` handlers to StatTile components
- Filter tickets when status tile clicked
- Visual active state

**3. Add Ticket Category Filter** (1 hour)
- Add category dropdown next to search
- Filter tickets by category
- Persist selected category

**Estimated effort**: 2 hours total  
**Impact**: Improves ticket workflow significantly

---

### Priority 2 - Nice to Have:

**4. Enhanced Dispatch Filters** (optional)
- v2 already reuses v1 DispatchManager, so all filters work
- Could modernize UI to match v2 design system
- Not urgent since functionality is already there

**Estimated effort**: 4-6 hours (cosmetic only)  
**Impact**: Visual consistency, not functional

---

## 📊 Feature Parity Scorecard

| Tab | v1 Feature Count | v2 Feature Count | Status |
|-----|------------------|------------------|--------|
| **Dispatch** | 4 filters | 4 filters | 🟰 Equal (reuses v1) |
| **Orders** | 0 filters (no dedicated view) | 7 filters | ✅ v2 BETTER |
| **Parcels** | 0 (tab doesn't exist) | 2 filters | ✅ v2 BETTER |
| **Tickets** | 3 filters (search + status + category) | 1.5 filters (search + status counts) | ⚠️ v2 PARTIAL |
| **Fulfilment/Routing** | 7 filters (entire board) | 0 (tab doesn't exist) | ❌ v2 MISSING |

### Overall Assessment:
- **v2 is ahead** on: Orders, Parcels
- **v2 is behind** on: Fulfilment/Routing (completely missing), Tickets (partial)
- **v2 is equal** on: Dispatch (reuses v1 component)

**Conclusion**: v2 cannot replace v1 until the Fulfilment/Routing board is ported.

---

## 🚀 Recommended Implementation Order

### Phase 1: Critical Gap (Block v2 launch)
1. ✅ Port AdminGbFulfilment to v2 as `FulfilmentTab.tsx`
2. ✅ Implement all 7 filters
3. ✅ Test routing workflows

### Phase 2: Polish (Improve existing)
4. ✅ Make ticket status tiles clickable
5. ✅ Add ticket category filter

### Phase 3: Optional (Nice to have)
6. ⚠️ Modernize Dispatch tab UI (currently uses v1 component)

---

## 💡 Design Recommendations for Fulfilment Tab

### Layout Option A: Kanban Board (like v1)
```
┌─────────────────────────────────────────────────────────────┐
│ [Search] [Route Type ▼] [Payment ▼] [Country ▼] [Flags ▼] │
│ [Group By: Reshipper ▼] [View: Board 📊 / List 📋]       │
├─────────────────────────────────────────────────────────────┤
│ Unrouted (45)    │ @john_reshipper (23) │ Direct Ship (67) │
│ ┌──────────────┐ │ ┌──────────────┐     │ ┌──────────────┐ │
│ │ Order #123   │ │ │ Order #456   │     │ │ Order #789   │ │
│ │ @alice | UK  │ │ │ @bob | FR    │     │ │ @carol | US  │ │
│ │ £125 | Paid  │ │ │ £85 | Paid   │     │ │ £200 | Paid  │ │
│ └──────────────┘ │ └──────────────┘     │ └──────────────┘ │
│ [Drag to assign] │ [Mark as shipped]    │ [Print labels]   │
└─────────────────────────────────────────────────────────────┘
```

### Layout Option B: List View (simpler to implement first)
```
┌─────────────────────────────────────────────────────────────┐
│ [Search] [Route Type ▼] [Payment ▼] [Country ▼] [Flags ▼] │
├─────────────────────────────────────────────────────────────┤
│ ☐ Order ID  │ Member    │ Country │ Payment │ Route       │
│ ☐ ORD-123   │ @alice    │ UK      │ Paid    │ Unrouted    │
│ ☐ ORD-456   │ @bob      │ FR      │ Paid    │ @john_resh. │
│ ☐ ORD-789   │ @carol    │ US      │ Unpaid  │ Direct Ship │
│                                                             │
│ Selected: 3 orders                                          │
│ [Assign to Reshipper ▼] [Mark as Direct] [Flag Order ▼]   │
└─────────────────────────────────────────────────────────────┘
```

**Recommendation**: Start with **List View** (Option B) for faster implementation, add Kanban board later as v2.1 enhancement.

---

## 📝 Summary

**v2 is BETTER than v1 for**:
- ✅ Orders management (7 advanced filters vs 0 in v1)
- ✅ Parcels tracking (new feature)
- ✅ User experience (modern UI, better performance)

**v2 is MISSING from v1**:
- ❌ Entire Fulfilment/Routing board (7 filters, critical workflow)
- ❌ Ticket category filter
- ⚠️ Ticket status filter UI (counts exist, filter logic missing)

**Blocker for v2 production launch**:
The missing Fulfilment/Routing board is the **only critical gap**. Without it, organizers cannot assign orders to reshippers or manage routing, which is a core workflow.

**Estimated work to achieve parity**:
- Fulfilment tab: 10-15 hours
- Ticket filters: 2 hours
- **Total: 12-17 hours**

After this work, v2 will have **100% feature parity** with v1 and **exceed** v1 in Orders and Parcels functionality.
