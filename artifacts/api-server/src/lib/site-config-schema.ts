/**
 * Registry of well-known site_config keys.
 *
 * Lets the generic admin editor render type-aware controls and shows
 * descriptions, defaults and grouping. Unknown keys are still editable
 * as raw strings.
 */

export type ConfigType = "boolean" | "number" | "string" | "json" | "secret";

export interface ConfigKeyDescriptor {
  key: string;
  type: ConfigType;
  group: string;
  label: string;
  description: string;
  defaultValue: string | null;
  /** When true, this key is also exposed by /api/config to the public app. */
  publicallyExposed?: boolean;
}

export const SITE_CONFIG_REGISTRY: ConfigKeyDescriptor[] = [
  // ── Payments ─────────────────────────────────────────────────
  { key: "paymentsEnabled", type: "boolean", group: "Payments", label: "Payments enabled", description: "Master switch for all order payments.", defaultValue: "true", publicallyExposed: true },
  { key: "walletAddress", type: "string", group: "Payments", label: "Default crypto wallet", description: "Fallback payout wallet shown to customers when no per-GB wallet is set.", defaultValue: null },
  { key: "anonPayEnabled", type: "boolean", group: "Payments", label: "AnonPay enabled", description: "Show the AnonPay (Trocador) payment option to customers.", defaultValue: "true" },
  { key: "payment_verify_tolerance", type: "number", group: "Payments", label: "TX verify tolerance", description: "Allowed underpayment fraction when auto-verifying crypto transactions (e.g. 0.15 = 15%).", defaultValue: "0.15" },

  // ── Wholesale ────────────────────────────────────────────────
  { key: "wholesale_requires_approval", type: "boolean", group: "Wholesale", label: "Requires approval", description: "Wholesale customers must be approved before they can order.", defaultValue: "false", publicallyExposed: true },
  { key: "wholesale_show_stock", type: "boolean", group: "Wholesale", label: "Show stock", description: "Display per-product stock counts on the wholesale page.", defaultValue: "true", publicallyExposed: true },
  { key: "wholesale_page_message", type: "string", group: "Wholesale", label: "Page message", description: "Banner text shown on the wholesale landing page.", defaultValue: null, publicallyExposed: true },
  { key: "wholesale_usdt_wallet", type: "string", group: "Wholesale", label: "USDT wallet", description: "USDT wallet shown to wholesale customers.", defaultValue: null },
  { key: "wholesale_anon_pay_enabled", type: "boolean", group: "Wholesale", label: "AnonPay enabled (wholesale)", description: "Show AnonPay option on wholesale checkout.", defaultValue: "false" },
  { key: "wholesale_anon_pay_wallet", type: "string", group: "Wholesale", label: "AnonPay wallet", description: "Wholesale AnonPay payout wallet.", defaultValue: null },
  { key: "wholesale_anon_pay_ticker", type: "string", group: "Wholesale", label: "AnonPay ticker", description: "Coin ticker for wholesale AnonPay (e.g. usdt).", defaultValue: "usdt" },
  { key: "wholesale_anon_pay_network", type: "string", group: "Wholesale", label: "AnonPay network", description: "Network for wholesale AnonPay (e.g. ERC20, TRC20).", defaultValue: "ERC20" },

  // ── Shipping ─────────────────────────────────────────────────
  { key: "shipping_admin_fee_enabled", type: "boolean", group: "Shipping", label: "Admin fee enabled", description: "Apply an admin fee to qualifying shipments.", defaultValue: "false", publicallyExposed: true },
  { key: "shipping_admin_fee_amount", type: "number", group: "Shipping", label: "Admin fee amount", description: "Admin fee amount in USD.", defaultValue: "10", publicallyExposed: true },
  { key: "shipping_admin_fee_countries", type: "json", group: "Shipping", label: "Admin fee countries", description: "JSON array of country names where the admin fee applies.", defaultValue: "[]", publicallyExposed: true },
  { key: "vendorShippingWarning", type: "boolean", group: "Shipping", label: "Vendor shipping warning", description: "Show the vendor shipping warning banner at checkout.", defaultValue: "true", publicallyExposed: true },

  // ── Group Buys ───────────────────────────────────────────────
  { key: "groupBuysPageMessage", type: "string", group: "Group Buys", label: "Page message", description: "Banner text shown on the public group buys list.", defaultValue: null, publicallyExposed: true },

  // ── Access ───────────────────────────────────────────────────
  { key: "signup_requires_invite", type: "boolean", group: "Access", label: "Invite required", description: "New signups must provide a valid invite code.", defaultValue: "false", publicallyExposed: true },
  { key: "discuss_limit", type: "number", group: "Access", label: "Discuss limit", description: "Per-user rate limit for discussion posts.", defaultValue: "20" },

  // ── Integrations ─────────────────────────────────────────────
  { key: "telegramBotToken", type: "secret", group: "Integrations", label: "Telegram bot token", description: "Telegram bot token used for member notifications.", defaultValue: null },
  { key: "telegramAdminChatId", type: "secret", group: "Integrations", label: "Telegram admin chat ID", description: "Chat ID that receives admin alerts.", defaultValue: null },
  { key: "track17ApiKey", type: "secret", group: "Integrations", label: "17track API key", description: "API key for the tracking auto-refresh job.", defaultValue: null },
  { key: "qiyunleToken", type: "secret", group: "Integrations", label: "Qiyunle session token", description: "Auto-managed Qiyunle share token. Cleared when the auto-sync re-logs in.", defaultValue: null },

  // ── Inventory ────────────────────────────────────────────────
  { key: "inventoryModalEnabled", type: "boolean", group: "Inventory", label: "Inventory modal enabled", description: "Show the inventory modal on the product page.", defaultValue: "false" },

  // ── Schedulers ───────────────────────────────────────────────
  { key: "scheduler.gb-auto-close.enabled", type: "boolean", group: "Schedulers", label: "GB auto-close enabled", description: "Master switch for the group-buy auto-close job.", defaultValue: "true" },
  { key: "scheduler.gb-auto-close.intervalMs", type: "number", group: "Schedulers", label: "GB auto-close interval (ms)", description: "Polling interval for the group-buy auto-close job.", defaultValue: "3600000" },
  { key: "scheduler.pool-payment-auto-verify.enabled", type: "boolean", group: "Schedulers", label: "Pool payment verify enabled", description: "Master switch for testing-pool payment verification.", defaultValue: "true" },
  { key: "scheduler.pool-payment-auto-verify.intervalMs", type: "number", group: "Schedulers", label: "Pool payment verify interval (ms)", description: "Polling interval for testing-pool payment verification.", defaultValue: "600000" },
  { key: "scheduler.tracking-auto-refresh.enabled", type: "boolean", group: "Schedulers", label: "Tracking refresh enabled", description: "Master switch for the 17track tracking refresher.", defaultValue: "true" },
  { key: "scheduler.tracking-auto-refresh.intervalMs", type: "number", group: "Schedulers", label: "Tracking refresh interval (ms)", description: "Polling interval for the 17track tracking refresher.", defaultValue: "7200000" },
  { key: "scheduler.qiyunle-sync.enabled", type: "boolean", group: "Schedulers", label: "Qiyunle sync enabled", description: "Master switch for the Qiyunle inventory sync.", defaultValue: "true" },
  { key: "scheduler.qiyunle-sync.intervalMs", type: "number", group: "Schedulers", label: "Qiyunle sync interval (ms)", description: "Polling interval for the Qiyunle inventory sync.", defaultValue: "7200000" },
];

export const REGISTRY_BY_KEY: Record<string, ConfigKeyDescriptor> = Object.fromEntries(
  SITE_CONFIG_REGISTRY.map(d => [d.key, d]),
);

export function describeKey(key: string): ConfigKeyDescriptor | null {
  return REGISTRY_BY_KEY[key] ?? null;
}

export function validateValue(type: ConfigType, value: string): { ok: true } | { ok: false; error: string } {
  switch (type) {
    case "boolean":
      if (value !== "true" && value !== "false") return { ok: false, error: "Must be 'true' or 'false'" };
      return { ok: true };
    case "number":
      if (isNaN(parseFloat(value))) return { ok: false, error: "Must be a number" };
      return { ok: true };
    case "json":
      try { JSON.parse(value); return { ok: true }; }
      catch { return { ok: false, error: "Must be valid JSON" }; }
    case "string":
    case "secret":
      return { ok: true };
  }
}

export function maskSecret(value: string | null): string | null {
  if (!value) return value;
  if (value.length <= 4) return "•".repeat(value.length);
  return value.slice(0, 2) + "•".repeat(Math.max(0, value.length - 4)) + value.slice(-2);
}
