import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";

export const GROUP_BUY_REGION_ORDER = ["UK", "EU", "ROW", "UNKNOWN"] as const;
export type GroupBuyRegionKey = typeof GROUP_BUY_REGION_ORDER[number];

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

export interface GroupBuyBreakdownLineItem {
  productId: string;
  productName: string;
  quantity: number;
  lineTotal: number;
}

export interface GroupBuyBreakdownOrderInput {
  id: string;
  code: string;
  telegramUsername: string;
  accountCountry: string | null;
  paymentStatus: string | null;
  productSubtotal: number;
  lineItems: GroupBuyBreakdownLineItem[];
}

export interface GroupBuyBreakdownFilters {
  paymentStatus?: "all" | "paid" | "unpaid";
  region?: GroupBuyRegionKey | "all";
  country?: string | "all";
  productId?: string | "all";
  search?: string;
}

export interface GroupBuyBreakdownOrder {
  id: string;
  code: string;
  telegramUsername: string;
  accountCountry: string;
  quantity: number;
  lineTotal: number;
  paymentStatus: string;
}

export interface GroupBuyBreakdownProduct {
  productId: string;
  productName: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  orders: GroupBuyBreakdownOrder[];
}

export interface GroupBuyBreakdownCountry {
  key: string;
  label: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  products: GroupBuyBreakdownProduct[];
}

export interface GroupBuyBreakdownRegion {
  key: GroupBuyRegionKey;
  label: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  countries: GroupBuyBreakdownCountry[];
}

export interface GroupBuyBreakdown {
  regions: GroupBuyBreakdownRegion[];
  filters: {
    regions: { key: GroupBuyRegionKey; label: string }[];
    countries: { key: string; label: string; region: GroupBuyRegionKey }[];
    products: { productId: string; productName: string }[];
  };
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(3));
}

function countryDetails(country: string | null): { key: string; label: string; region: GroupBuyRegionKey } {
  if (!country?.trim()) {
    return { key: "UNKNOWN", label: "Unknown / Not set", region: "UNKNOWN" };
  }

  const key = normalizeToCode(country);
  const label = COUNTRY_CODE_TO_NAME[key] ?? country.trim();
  const region: GroupBuyRegionKey = key === "GB"
    ? "UK"
    : EU_COUNTRY_CODES.has(key)
      ? "EU"
      : "ROW";

  return { key, label, region };
}

function isPaid(paymentStatus: string | null): boolean {
  return paymentStatus === "confirmed" || paymentStatus === "paid" || paymentStatus === "test_confirmed";
}

function addTotals(target: { orderCount: number; kitCount: number; subtotal: number }, quantity: number, subtotal: number) {
  target.kitCount += quantity;
  target.subtotal += subtotal;
}

export function buildGroupBuyBreakdown(
  inputOrders: GroupBuyBreakdownOrderInput[],
  filters: GroupBuyBreakdownFilters = {},
): GroupBuyBreakdown {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const filtered = inputOrders.flatMap((order) => {
    if (filters.paymentStatus === "paid" && !isPaid(order.paymentStatus)) return [];
    if (filters.paymentStatus === "unpaid" && isPaid(order.paymentStatus)) return [];

    const country = countryDetails(order.accountCountry);
    if (filters.region && filters.region !== "all" && country.region !== filters.region) return [];
    if (filters.country && filters.country !== "all" && country.key !== normalizeToCode(filters.country)) return [];

    const matchingLines = order.lineItems.filter((line) => {
      if (filters.productId && filters.productId !== "all" && line.productId !== filters.productId) return false;
      if (!search) return true;
      return [order.code, order.telegramUsername, country.label, line.productName]
        .some(value => value.toLowerCase().includes(search));
    });
    if (matchingLines.length === 0) return [];

    return [{ order, country, matchingLines }];
  });

  const regionMap = new Map<GroupBuyRegionKey, GroupBuyBreakdownRegion>();
  for (const key of GROUP_BUY_REGION_ORDER) {
    regionMap.set(key, {
      key,
      label: key === "UK" ? "UK" : key === "EU" ? "EU" : key === "ROW" ? "Rest of World" : "Unknown / Not set",
      orderCount: 0,
      kitCount: 0,
      subtotal: 0,
      countries: [],
    });
  }

  const countryMaps = new Map<GroupBuyRegionKey, Map<string, GroupBuyBreakdownCountry>>();
  const productMaps = new Map<string, Map<string, GroupBuyBreakdownProduct>>();

  for (const { order, country, matchingLines } of filtered) {
    const region = regionMap.get(country.region)!;
    let countries = countryMaps.get(country.region);
    if (!countries) {
      countries = new Map();
      countryMaps.set(country.region, countries);
    }

    let countryNode = countries.get(country.key);
    if (!countryNode) {
      countryNode = {
        key: country.key,
        label: country.label,
        orderCount: 0,
        kitCount: 0,
        subtotal: 0,
        products: [],
      };
      countries.set(country.key, countryNode);
      region.countries.push(countryNode);
    }

    region.orderCount += 1;
    countryNode.orderCount += 1;
    const orderSubtotal = matchingLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const orderQuantity = matchingLines.reduce((sum, line) => sum + line.quantity, 0);
    addTotals(region, orderQuantity, orderSubtotal);
    addTotals(countryNode, orderQuantity, orderSubtotal);

    for (const line of matchingLines) {
      let products = productMaps.get(country.key);
      if (!products) {
        products = new Map();
        productMaps.set(country.key, products);
      }
      let productNode = products.get(line.productId);
      if (!productNode) {
        productNode = {
          productId: line.productId,
          productName: line.productName,
          orderCount: 0,
          kitCount: 0,
          subtotal: 0,
          orders: [],
        };
        products.set(line.productId, productNode);
        countryNode.products.push(productNode);
      }
      productNode.orderCount += 1;
      addTotals(productNode, line.quantity, line.lineTotal);
      productNode.orders.push({
        id: order.id,
        code: order.code,
        telegramUsername: order.telegramUsername,
        accountCountry: country.label,
        quantity: line.quantity,
        lineTotal: roundMoney(line.lineTotal),
        paymentStatus: order.paymentStatus ?? "unpaid",
      });
    }
  }

  const regions = GROUP_BUY_REGION_ORDER.map(key => regionMap.get(key)!)
    .filter(region => region.orderCount > 0)
    .map(region => ({
      ...region,
      kitCount: roundQuantity(region.kitCount),
      subtotal: roundMoney(region.subtotal),
      countries: region.countries
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(country => ({
          ...country,
          kitCount: roundQuantity(country.kitCount),
          subtotal: roundMoney(country.subtotal),
          products: country.products
            .sort((a, b) => a.productName.localeCompare(b.productName))
            .map(product => ({
              ...product,
              kitCount: roundQuantity(product.kitCount),
              subtotal: roundMoney(product.subtotal),
              orders: product.orders.sort((a, b) => a.code.localeCompare(b.code)),
            })),
        })),
    }));

  const countryOptions = new Map<string, { key: string; label: string; region: GroupBuyRegionKey }>();
  const productOptions = new Map<string, { productId: string; productName: string }>();
  for (const order of inputOrders) {
    const country = countryDetails(order.accountCountry);
    countryOptions.set(country.key, country);
    for (const line of order.lineItems) {
      productOptions.set(line.productId, { productId: line.productId, productName: line.productName });
    }
  }

  return {
    regions,
    filters: {
      regions: GROUP_BUY_REGION_ORDER.map(key => ({
        key,
        label: key === "UK" ? "UK" : key === "EU" ? "EU" : key === "ROW" ? "Rest of World" : "Unknown / Not set",
      })),
      countries: [...countryOptions.values()].sort((a, b) => a.label.localeCompare(b.label)),
      products: [...productOptions.values()].sort((a, b) => a.productName.localeCompare(b.productName)),
    },
  };
}