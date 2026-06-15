import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderResponse } from '@workspace/api-client-react';

export interface DraftLineItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface DraftState {
  // Order Identity
  orderId: string | null;
  code: string | null;

  // Group Buy
  groupBuyId: string | null;

  // Customer
  telegramUsername: string;

  // Delivery (selected method from delivery_methods table)
  deliveryMethodId: string;
  deliveryMethod: string;  // display name e.g. "Royal Mail"
  deliveryPrice: number;   // price for the chosen delivery method

  // Vendor Shipping (flat fee from server config)
  vendorShipping: number;

  // Tip (optional)
  tip: number;

  // Notes
  notes: string;

  // Line items
  lineItems: DraftLineItem[];

  // Top-up flag: true when this is an add-on order after a paid order
  // Delivery is always $0 for top-up orders
  isTopUp: boolean;

  // Lab Test Contribution ($15 optional)
  testingContribution: number;

  // Order type (e.g. "wholesale" for orders from WholesaleOrder page)
  orderType: string | null;

  // Wholesale shipping address (collected upfront on wholesale page)
  shippingName: string;
  shippingPhone: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCountry: string;

  // Preferred reshipper (when multiple reshippers serve the same country leg)
  preferredReshipperUsername: string | null;

  // Direct shipping preference (customer requests delivery straight to home address)
  directShippingRequested: boolean;

  // Reshipper code (entered by customer to be routed to a specific reshipper)
  reshipperCode: string | null;

  // Admin fee (stored from existing order for edits)
  adminFee: number;
  adminFeeLabel: string | null;

  // Actions
  setGroupBuyId: (id: string | null) => void;
  clearOrderId: () => void;
  setTelegramUsername: (username: string) => void;
  setDeliveryMethod: (id: string, name: string, price: number) => void;
  setVendorShipping: (amount: number) => void;
  setTip: (amount: number) => void;
  setNotes: (notes: string) => void;
  setTestingContribution: (amount: number) => void;
  setPreferredReshipperUsername: (username: string | null) => void;
  setDirectShippingRequested: (value: boolean) => void;
  setReshipperCode: (code: string | null) => void;
  setShippingName: (name: string) => void;
  setShippingAddress: (address: string) => void;
  setShippingPhone: (phone: string) => void;
  setShippingEmail: (email: string) => void;
  setShippingCountry: (country: string) => void;

  addLineItem: () => void;
  updateLineItem: (id: string, updates: Partial<DraftLineItem>) => void;
  removeLineItem: (id: string) => void;
  addProductLineItem: (productId: string, productName: string, unitPrice: number) => void;

  loadExistingOrder: (order: OrderResponse) => void;

  // Start a new add-on order for a customer who has already paid
  // Delivery is locked to $0 (already covered by the original order)
  startTopUpOrder: (order: OrderResponse) => void;

  // Cancel the top-up carry-over so delivery can be chosen normally
  clearTopUp: () => void;

  clearDraft: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      orderId: null,
      code: null,
      groupBuyId: null,
      telegramUsername: '',
      deliveryMethodId: '',
      deliveryMethod: '',
      deliveryPrice: 0,
      vendorShipping: 0,
      tip: 0,
      notes: '',
      lineItems: [],
      isTopUp: false,
      testingContribution: 0,
      orderType: null,
      shippingName: '',
      shippingPhone: '',
      shippingEmail: '',
      shippingAddress: '',
      shippingCountry: '',
      preferredReshipperUsername: null,
      directShippingRequested: false,
      reshipperCode: null,
      adminFee: 0,
      adminFeeLabel: null,

      setGroupBuyId: (groupBuyId) => set((state) => {
        if (groupBuyId !== null) {
          const isChangingGb = groupBuyId !== state.groupBuyId;
          return {
            groupBuyId,
            // Only reset isTopUp when actually switching to a different group buy.
            // Preserving it when the GB is the same allows the "Place Another Order" top-up
            // flow to keep its delivery-free flag after the OrderForm mounts.
            isTopUp: isChangingGb ? false : state.isTopUp,
            // When switching to a different group buy, clear stale delivery, line items, and orderId
            ...(isChangingGb
              ? {
                  deliveryMethodId: '',
                  deliveryMethod: '',
                  deliveryPrice: 0,
                  orderId: null,
                  code: null,
                  preferredReshipperUsername: null,
                  directShippingRequested: false,
                  lineItems: [{ id: generateId(), productId: '', productName: '', quantity: 1, unitPrice: 0, lineTotal: 0 }],
                }
              : {}),
          };
        }
        return { groupBuyId };
      }),

      clearOrderId: () => set({ orderId: null, code: null }),
      setTelegramUsername: (telegramUsername) => set({ telegramUsername }),
      setDeliveryMethod: (deliveryMethodId, deliveryMethod, deliveryPrice) =>
        set({ deliveryMethodId, deliveryMethod, deliveryPrice }),
      setVendorShipping: (vendorShipping) => set({ vendorShipping }),
      setTip: (tip) => set({ tip: Math.max(0, tip) }),
      setNotes: (notes) => set({ notes }),
      setTestingContribution: (testingContribution) => set({ testingContribution: Math.max(0, testingContribution) }),
      setPreferredReshipperUsername: (preferredReshipperUsername) => set({ preferredReshipperUsername }),
      setDirectShippingRequested: (directShippingRequested) => set({ directShippingRequested }),
      setReshipperCode: (reshipperCode) => set({ reshipperCode }),
      setShippingName: (shippingName) => set({ shippingName }),
      setShippingAddress: (shippingAddress) => set({ shippingAddress }),
      setShippingPhone: (shippingPhone) => set({ shippingPhone }),
      setShippingEmail: (shippingEmail) => set({ shippingEmail }),
      setShippingCountry: (shippingCountry) => set({ shippingCountry }),

      addLineItem: () => set((state) => ({
        lineItems: [
          ...state.lineItems,
          { id: generateId(), productId: '', productName: '', quantity: 1, unitPrice: 0, lineTotal: 0 }
        ]
      })),

      updateLineItem: (id, updates) => set((state) => ({
        lineItems: state.lineItems.map(item => {
          if (item.id !== id) return item;
          const updatedItem = { ...item, ...updates };
          updatedItem.lineTotal = parseFloat((updatedItem.quantity * updatedItem.unitPrice).toFixed(2));
          return updatedItem;
        })
      })),

      removeLineItem: (id) => set((state) => ({
        lineItems: state.lineItems.filter(item => item.id !== id)
      })),

      addProductLineItem: (productId, productName, unitPrice) => set((state) => {
        const emptyItem = state.lineItems.find(item => !item.productId);
        if (emptyItem) {
          return {
            lineItems: state.lineItems.map(item =>
              item.id === emptyItem.id
                ? { ...item, productId, productName, unitPrice, lineTotal: unitPrice }
                : item
            )
          };
        }
        return {
          lineItems: [
            ...state.lineItems,
            { id: generateId(), productId, productName, quantity: 1, unitPrice, lineTotal: unitPrice }
          ]
        };
      }),

      loadExistingOrder: (order) => {
        const isDirectShipping = (order as any).directShippingRequested === true;
        return set({
          orderId: order.id,
          code: order.code,
          groupBuyId: (order as any).groupBuyId ?? null,
          telegramUsername: order.telegramUsername,
          // For direct-to-home orders the virtual "__direct_shipping" method must
          // be used so the backend accepts the PUT without looking up the DB row.
          deliveryMethodId: isDirectShipping ? '__direct_shipping' : ((order as any).deliveryMethodId || ''),
          deliveryMethod: order.deliveryMethod,
          deliveryPrice: order.deliveryPrice,
          vendorShipping: order.vendorShipping,
          tip: order.tip,
          notes: order.notes || '',
          isTopUp: false,
          directShippingRequested: isDirectShipping,
          shippingName: (order as any).shippingName ?? '',
          shippingPhone: (order as any).shippingPhone ?? '',
          shippingEmail: (order as any).shippingEmail ?? '',
          shippingAddress: (order as any).shippingAddress ?? '',
          shippingCountry: (order as any).shippingCountry ?? '',
          testingContribution: (order as any).testingContribution ?? 0,
          adminFee: (order as any).adminFee ?? 0,
          adminFeeLabel: (order as any).adminFeeLabel ?? null,
          lineItems: order.lineItems.map(item => ({
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal
          }))
        });
      },

      startTopUpOrder: (order) => set({
        orderId: null,
        code: null,
        groupBuyId: (order as any).groupBuyId ?? null,
        telegramUsername: order.telegramUsername,
        deliveryMethodId: (order as any).deliveryMethodId || '',
        deliveryMethod: order.deliveryMethod,
        deliveryPrice: 0,
        vendorShipping: 0,
        tip: 0,
        notes: '',
        isTopUp: true,
        testingContribution: 0,
        lineItems: [{ id: generateId(), productId: '', productName: '', quantity: 1, unitPrice: 0, lineTotal: 0 }]
      }),

      clearTopUp: () => set({ isTopUp: false, deliveryMethodId: '', deliveryMethod: '', deliveryPrice: 0 }),

      clearDraft: () => set({
        orderId: null,
        code: null,
        groupBuyId: null,
        telegramUsername: '',
        deliveryMethodId: '',
        deliveryMethod: '',
        deliveryPrice: 0,
        vendorShipping: 0,
        tip: 0,
        notes: '',
        isTopUp: false,
        testingContribution: 0,
        orderType: null,
        shippingName: '',
        shippingPhone: '',
        shippingEmail: '',
        shippingAddress: '',
        shippingCountry: '',
        preferredReshipperUsername: null,
        directShippingRequested: false,
        reshipperCode: null,
        adminFee: 0,
        adminFeeLabel: null,
        lineItems: []
      })
    }),
    { name: 'peps-order-draft' }
  )
);
