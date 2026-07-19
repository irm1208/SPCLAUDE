export interface SetupBasicsDraft {
  name: string;
  description: string;
  currency: string;
  closeDate: string;
  manufacturer: string;
  manufacturerCountry: string;
  labTestSupplier: string;
}

export interface SetupProductDraft {
  id: string;
  name: string;
  price: string;
  category: string;
  stock: string;
}

export interface SetupShippingOptionDraft {
  id: string;
  label: string;
  price: string;
  description: string;
  region: string;
  requiresAddress: boolean;
  requiresQr: boolean;
}

export interface SetupPaymentDraft {
  cryptoEnabled: boolean;
  cryptoWallets: Array<{ id: string; currency: string; network: string; address: string }>;
  anonpayEnabled: boolean;
  anonpayWallet: string;
  anonpayCurrency: string;
  anonpayNetwork: string;
  revolutEnabled: boolean;
  revolutHandle: string;
  paypalEnabled: boolean;
  paypalHandle: string;
}

export interface SetupAccessDraft {
  entryFeeEnabled: boolean;
  entryFeeAmount: string;
  entryFeeLabel: string;
  countryMode: "all" | "allow" | "block";
  countries: string[];
  blockedAccounts: string[];
  pinEnabled: boolean;
  pin: string;
}

export interface SetupRulesDraft {
  welcomeMessage: string;
  rules: Array<{ id: string; text: string }>;
  disclaimer: string;
  additionalInfo: string;
}

export interface SetupDraftSnapshot {
  basics?: SetupBasicsDraft;
  products?: { products: SetupProductDraft[] };
  shipping?: { options: SetupShippingOptionDraft[] };
  payments?: SetupPaymentDraft;
  access?: SetupAccessDraft;
  rules?: SetupRulesDraft;
}

const clean = (value: string | undefined): string => value?.trim() ?? "";
const optional = (value: string | undefined): string | undefined => clean(value) || undefined;

export function buildSetupPayload(draft: SetupDraftSnapshot): Record<string, unknown> {
  const basics = draft.basics;
  const payments = draft.payments;
  const access = draft.access;
  const rules = draft.rules;
  const cryptoOptions = payments?.cryptoEnabled
    ? payments.cryptoWallets.flatMap(wallet => {
        const currency = clean(wallet.currency);
        const network = clean(wallet.network);
        const walletAddress = clean(wallet.address);
        return currency && network && walletAddress ? [{ currency, network, walletAddress }] : [];
      })
    : [];
  const infoCards = [
    rules?.additionalInfo ? { title: "Additional information", body: clean(rules.additionalInfo) } : null,
    rules?.disclaimer ? { title: "Disclaimer", body: clean(rules.disclaimer) } : null,
  ].filter((item): item is { title: string; body: string } => Boolean(item?.body));

  return {
    name: clean(basics?.name),
    description: clean(basics?.description),
    currency: clean(basics?.currency) || "GBP",
    closeDate: clean(basics?.closeDate),
    manufacturer: clean(basics?.manufacturer),
    manufacturerCountry: clean(basics?.manufacturerCountry),
    labTestSupplier: clean(basics?.labTestSupplier),
    shippingOptions: (draft.shipping?.options ?? []).flatMap(option => {
      const label = clean(option.label);
      const price = Number(option.price);
      if (!label || !Number.isFinite(price) || price < 0) return [];
      return [{
        id: option.id,
        label,
        price,
        description: clean(option.description),
        region: clean(option.region),
        requiresAddress: option.requiresAddress,
        requiresQr: option.requiresQr,
      }];
    }),
    organiserPayments: {
      cryptoOptions,
      revolutHandle: payments?.revolutEnabled ? optional(payments.revolutHandle) : undefined,
      paypalHandle: payments?.paypalEnabled ? optional(payments.paypalHandle) : undefined,
      anonPayEnabled: payments?.anonpayEnabled ?? false,
      anonPayWallet: payments?.anonpayEnabled ? optional(payments.anonpayWallet) : undefined,
      anonPayTicker: payments?.anonpayEnabled ? optional(payments.anonpayCurrency)?.toLowerCase() : undefined,
      anonPayNetwork: payments?.anonpayEnabled ? optional(payments.anonpayNetwork) : undefined,
    },
    allowedCountries: access?.countryMode === "allow" ? access.countries.map(clean).filter(Boolean) : [],
    excludedCountries: access?.countryMode === "block" ? access.countries.map(clean).filter(Boolean) : [],
    blockedAccounts: (access?.blockedAccounts ?? []).map(value => clean(value).replace(/^@/, "")).filter(Boolean),
    invitePin: access?.pinEnabled ? clean(access.pin) : "",
    entryFeeEnabled: access?.entryFeeEnabled ?? false,
    entryFeeAmount: access?.entryFeeEnabled && Number.isFinite(Number(access.entryFeeAmount)) ? Number(access.entryFeeAmount) : 0,
    entryFeeLabel: access?.entryFeeEnabled ? clean(access.entryFeeLabel) : "",
    infoCards,
    orderPageMessage: clean(rules?.welcomeMessage),
  };
}

export function buildSetupProducts(draft: SetupDraftSnapshot): Array<Record<string, unknown>> {
  return (draft.products?.products ?? []).flatMap(product => {
    const name = clean(product.name);
    const price = Number(product.price);
    if (!name || !Number.isFinite(price) || price < 0) return [];
    const vendor = clean(product.category) || clean(draft.basics?.manufacturer) || "Organiser";
    const stock = product.stock === "" ? null : Number(product.stock);
    return [{
      name,
      price,
      vendor,
      category: vendor,
      stock: Number.isFinite(stock) ? stock : null,
    }];
  });
}

export function buildSetupRules(draft: SetupDraftSnapshot) {
  return (draft.rules?.rules ?? []).flatMap(rule => {
    const text = clean(rule.text);
    return text ? [{ id: rule.id, text, enabled: true, format: "text" }] : [];
  });
}
