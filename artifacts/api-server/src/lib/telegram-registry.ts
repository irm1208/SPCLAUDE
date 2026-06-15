// ── Telegram Template Registry ────────────────────────────────────────────────
// Single source of truth for all canonical notification event keys,
// their metadata, placeholder lists, and default template strings.
// Imported by both lib/telegram.ts (runtime) and routes/telegram-templates.ts (CRUD API).
//
// editableInAdmin: false  — event is used by the template engine at runtime but
// is NOT surfaced in the admin template editor (GET /admin/telegram-templates
// only returns the 20 editable events defined in the task spec).

export interface TemplateEventMeta {
  eventKey: string;
  label: string;
  audience: "customer" | "admin" | "organiser" | "reshipper" | "bot";
  prefKey: string | null;
  description: string;
  placeholders: string[];
  defaultTemplate: string;
  /** When false, the event is excluded from the admin template editor UI/API. */
  editableInAdmin?: boolean;
}

export const TEMPLATE_REGISTRY: TemplateEventMeta[] = [
  // ── Customer notifications ──────────────────────────────────────────────────
  {
    eventKey: "customer_new_order",
    label: "New Order (Customer)",
    audience: "customer",
    prefKey: "new_order",
    description: "Sent to the customer when they place a new order.",
    placeholders: ["code", "username", "date", "order_total", "items", "total_qty", "delivery", "delivery_fee", "tip", "payment_status", "gb_name", "organiser", "app_url"],
    defaultTemplate:
      `🛒 <b>Order Placed!</b>\n\nYour order <code>#{{code}}</code> has been submitted.{{gb_name}}\n\nFrom: @{{username}}\nDate: {{date}}\nOrder Total: <b>{{order_total}}</b>\nItems:\n{{items}}\nTotal Qty: {{total_qty}}\nDelivery: {{delivery}}\nTip: {{tip}}\nPayment: {{payment_status}}\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  {
    eventKey: "customer_status_update",
    label: "Order Status Updated (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to the customer when their order status changes.",
    placeholders: ["code", "username", "emoji", "status", "tracking", "order_total", "delivery", "payment_status", "gb_name", "app_url"],
    defaultTemplate:
      `{{emoji}} <b>Order Status Updated</b>\n\nOrder <code>#{{code}}</code> is now <b>{{status}}</b>.{{gb_name}}{{tracking}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  {
    eventKey: "customer_waitlist_promoted",
    label: "Waitlist Promoted (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to the customer when they are promoted from a group buy waitlist.",
    placeholders: ["gb_name", "organiser", "username"],
    defaultTemplate:
      `✅ <b>You're in!</b>\n\nA spot opened up and you've been moved from the waitlist into the group buy.\n\nGB: <b>{{gb_name}}</b>\nOrganiser: {{organiser}}\nFrom: @{{username}}\nUser Total: —\nDelivery: —\nPayment: Unpaid`,
  },
  {
    eventKey: "customer_order_cancelled",
    label: "Order Cancelled (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to the customer when admin cancels their order.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name", "app_url"],
    defaultTemplate:
      `❌ <b>Order Cancelled</b>\n\nOrder <code>#{{code}}</code> has been cancelled.{{gb_name}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}\n\nIf you have questions, please contact support.\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  {
    eventKey: "customer_order_deleted",
    label: "Order Deleted (Customer)",
    audience: "customer",
    prefKey: "deleted",
    description: "Sent to the customer when they self-delete their own order.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name", "app_url"],
    defaultTemplate:
      `🗑️ <b>Order Deleted</b>\n\nYour order <code>#{{code}}</code> has been deleted.{{gb_name}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}\n\nIf this was a mistake, please <a href="{{app_url}}">place a new order</a>.`,
  },
  {
    eventKey: "customer_order_deleted_by_admin",
    label: "Order Deleted by Admin (Customer)",
    audience: "customer",
    prefKey: "deleted",
    description: "Sent to the customer when an admin deletes their order.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name", "app_url"],
    defaultTemplate:
      `🗑️ <b>Order Removed</b>\n\nYour order <code>#{{code}}</code> has been removed by the admin.{{gb_name}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}\n\nIf you have questions, please reach out to support.\n\n<a href="{{app_url}}">Visit the site →</a>`,
  },
  {
    eventKey: "customer_order_edited",
    label: "Order Edited (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to the customer when they successfully edit their own order.",
    placeholders: ["code", "username", "order_total", "delivery"],
    defaultTemplate:
      `✏️ <b>Order Updated</b>\n\nYour order <code>#{{code}}</code> has been updated.\n\nFrom: @{{username}}\nNew Total: {{order_total}}\nDelivery: {{delivery}}`,
  },
  {
    eventKey: "customer_payment_confirmed",
    label: "Payment Confirmed (Customer)",
    audience: "customer",
    prefKey: "payment",
    description: "Sent to the customer when their payment is confirmed.",
    placeholders: ["code", "username", "order_total", "delivery", "gb_name", "app_url", "amount_received", "payment_method"],
    defaultTemplate:
      `💰 <b>Payment Confirmed!</b>\n\nPayment for order <code>#{{code}}</code> has been confirmed.{{gb_name}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nAmount Received: {{amount_received}}\nPayment Method: {{payment_method}}\nDelivery: {{delivery}}\n\nThank you!\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  {
    eventKey: "customer_payment_failed",
    label: "Payment Failed (Customer)",
    audience: "customer",
    prefKey: "payment",
    description: "Sent to the customer when their payment is marked as failed.",
    placeholders: ["code", "username", "order_total", "delivery", "gb_name", "app_url"],
    defaultTemplate:
      `⚠️ <b>Payment Issue</b>\n\nThere was a problem with your payment for order <code>#{{code}}</code>.{{gb_name}}\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: Unpaid\n\nPlease contact support for assistance.\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  {
    eventKey: "customer_profile_linked",
    label: "Profile / Telegram Linked (Customer)",
    audience: "customer",
    prefKey: "profile",
    description: "Sent to the customer when their Telegram is linked or profile is updated.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `👤 <b>Profile Updated</b>\n\nYour profile details have been updated successfully.`,
  },
  {
    eventKey: "customer_order_shipped",
    label: "Order Shipped (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to the customer when their order is shipped (tracking number set).",
    placeholders: ["code", "username", "tracking", "order_total", "delivery", "payment_status", "gb_name", "app_url"],
    defaultTemplate:
      `📦 <b>Order Shipped!</b>\n\nOrder <code>#{{code}}</code> has been shipped.{{gb_name}}\nTracking: <code>{{tracking}}</code>\n\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}\n\n<a href="{{app_url}}/account">View your orders →</a>`,
  },
  // ── Admin notifications ─────────────────────────────────────────────────────
  {
    eventKey: "admin_new_order",
    label: "New Order (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a customer places a new order.",
    placeholders: ["code", "username", "order_total", "items", "total_qty", "delivery", "delivery_fee", "tip", "payment_status", "gb_name", "organiser"],
    defaultTemplate:
      `🆕 <b>New Order</b> <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nPayment: {{payment_status}}\n\n{{items}}\n\nDelivery: {{delivery}} ({{delivery_fee}}){{tip}}\nUser Total: {{order_total}}`,
  },
  {
    eventKey: "admin_order_edited",
    label: "Order Edited by Customer (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a customer edits their order.",
    placeholders: ["code", "username", "order_total", "items", "delivery", "delivery_fee", "tip"],
    defaultTemplate:
      `✏️ <b>Order Edited</b> <code>#{{code}}</code>\nBy: @{{username}}\n\n{{items}}\n\nDelivery: {{delivery}} ({{delivery_fee}}){{tip}}\nNew Total: {{order_total}}`,
  },
  {
    eventKey: "admin_order_cancelled",
    label: "Order Cancelled (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when an order is cancelled.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name", "organiser"],
    defaultTemplate:
      `❌ <b>Order Cancelled</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}`,
  },
  {
    eventKey: "admin_order_deleted_by_admin",
    label: "Order Deleted by Admin (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when admin deletes a single order.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name", "organiser"],
    defaultTemplate:
      `🗑️ <b>Order Deleted by Admin</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}`,
  },
  {
    eventKey: "admin_order_deleted_by_customer",
    label: "Order Deleted by Customer (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a customer deletes their own order.",
    placeholders: ["code", "username", "order_total", "delivery", "payment_status", "gb_name"],
    defaultTemplate:
      `🗑️ <b>Order Deleted by Customer</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}`,
  },
  {
    eventKey: "admin_bulk_delete",
    label: "Bulk Order Delete (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when multiple orders are bulk-deleted.",
    placeholders: ["count", "orders_summary"],
    defaultTemplate:
      `🗑️ <b>Bulk Delete by Admin</b>\n{{count}} order(s) removed:\n\n{{orders_summary}}`,
  },
  {
    eventKey: "admin_status_update",
    label: "Order Status Updated (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when an order status is changed.",
    placeholders: ["code", "username", "emoji", "status", "order_total", "delivery", "payment_status", "gb_name"],
    defaultTemplate:
      `{{emoji}} <b>Order Status Updated</b>\nOrder: <code>#{{code}}</code> → <b>{{status}}</b>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: {{payment_status}}`,
  },
  {
    eventKey: "admin_payment_confirmed",
    label: "Payment Confirmed (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a payment is confirmed.",
    placeholders: ["code", "username", "order_total", "delivery", "gb_name", "amount_received", "payment_method", "txid_line", "test_info"],
    defaultTemplate:
      `💰 <b>Payment Confirmed</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nAmount Received: {{amount_received}}\nMethod: {{payment_method}}{{txid_line}}{{test_info}}\nDelivery: {{delivery}}`,
  },
  {
    eventKey: "admin_test_payment_confirmed",
    label: "Test Payment Confirmed (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a customer's test (micro) payment is verified on-chain.",
    placeholders: ["code", "username", "test_amount", "txid", "remainder", "delivery", "gb_name"],
    defaultTemplate:
      `🧪 <b>Test Payment Received</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nTest Amount: {{test_amount}} USDT\nMethod: Crypto\nTXID: <code>{{txid}}</code>\nRemainder Due: {{remainder}} USDT\nDelivery: {{delivery}}`,
  },
  {
    eventKey: "admin_payment_failed",
    label: "Payment Failed (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a payment is marked as failed.",
    placeholders: ["code", "username", "order_total", "delivery", "gb_name"],
    defaultTemplate:
      `⚠️ <b>Payment Failed</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nDelivery: {{delivery}}\nPayment: Unpaid`,
  },
  {
    eventKey: "admin_payment_submitted",
    label: "Payment Submitted (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a customer submits a payment that requires manual confirmation.",
    placeholders: ["code", "username", "order_total", "delivery", "gb_name", "method", "amount_received"],
    defaultTemplate:
      `💳 <b>Payment Submitted</b>\nOrder: <code>#{{code}}</code>{{gb_name}}\nFrom: @{{username}}\nUser Total: {{order_total}}\nAmount: {{amount_received}}\nMethod: {{method}}\nDelivery: {{delivery}}\nStatus: Awaiting Confirmation`,
  },
  {
    eventKey: "admin_new_account",
    label: "New Account (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a new customer account is registered.",
    placeholders: ["username"],
    defaultTemplate:
      `🙋 <b>New Customer</b>\n@{{username}} just registered an account.`,
  },
  {
    eventKey: "admin_role_application_organiser",
    label: "Organiser Application (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a member applies to become a GB Organiser.",
    placeholders: ["username"],
    defaultTemplate:
      `📋 <b>New Organiser Application</b>\n\n@{{username}} has applied to become a GB Organiser.\n\nReview in the admin dashboard.`,
  },
  {
    eventKey: "admin_role_application_pool_leader",
    label: "Pool Leader Application (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a member applies to become a Pool Leader.",
    placeholders: ["username"],
    defaultTemplate:
      `📋 <b>New Pool Leader Application</b>\n\n@{{username}} has applied to become a Testing Pool Leader.\n\nReview in the admin dashboard.`,
  },
  {
    eventKey: "admin_role_application_reshipper",
    label: "Reshipper Application (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat when a member applies to become a Reshipper.",
    placeholders: ["username"],
    defaultTemplate:
      `📋 <b>New Reshipper Application</b>\n\n@{{username}} has applied to become a Reshipper.\n\nReview in the admin dashboard.`,
  },
  {
    eventKey: "admin_organiser_update",
    label: "Organiser / GB Event (Admin)",
    audience: "admin",
    prefKey: null,
    description: "Sent to the admin chat for group buy and organiser events (GB created, status changed, waitlist promoted, etc.).",
    placeholders: ["organiser_username", "update_type", "details"],
    defaultTemplate:
      `📋 <b>Organiser Update</b>\n@{{organiser_username}} · {{update_type}}\n{{details}}`,
  },
  // ── Organiser notifications ──────────────────────────────────────────────────
  {
    eventKey: "organiser_gb_approved",
    label: "GB Application Approved (Organiser)",
    audience: "organiser",
    prefKey: "status",
    description: "Sent to the organiser when their group buy application is approved.",
    placeholders: ["gb_name", "username", "app_url"],
    defaultTemplate:
      `✅ <b>Group Buy Approved!</b>\n\nYour group buy <b>{{gb_name}}</b> has been approved and is now live.\n\nFrom: @{{username}}\n\n<a href="{{app_url}}">View your group buy →</a>`,
  },
  {
    eventKey: "organiser_action",
    label: "Misc Organiser Event (Organiser)",
    audience: "organiser",
    prefKey: "status",
    description: "Generic notification for miscellaneous organiser events.",
    placeholders: ["username", "action", "details"],
    defaultTemplate:
      `📣 <b>Organiser Notification</b>\n\n@{{username}}\n{{action}}\n\n{{details}}`,
  },
  // ── Role application outcome notifications (sent to the applicant) ──────────
  {
    eventKey: "applicant_organiser_approved",
    label: "Organiser Application Approved (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their GB Organiser application is approved.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `✅ <b>Organiser Application Approved!</b>\n\nCongratulations, @{{username}}! Your application to become a GB Organiser has been approved.\n\nYou can now create and manage group buys on the platform.\n\n<a href="{{app_url}}">Get started →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "applicant_organiser_rejected",
    label: "Organiser Application Rejected (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their GB Organiser application is rejected.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `❌ <b>Organiser Application Unsuccessful</b>\n\nHi @{{username}}, unfortunately your application to become a GB Organiser has not been approved at this time.\n\nIf you have questions, please reach out to support.\n\n<a href="{{app_url}}">Visit the site →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "applicant_pool_leader_approved",
    label: "Pool Leader Application Approved (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their Testing Pool Leader application is approved.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `✅ <b>Pool Leader Application Approved!</b>\n\nCongratulations, @{{username}}! Your application to become a Testing Pool Leader has been approved.\n\nYou can now lead testing pools on the platform.\n\n<a href="{{app_url}}">Get started →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "applicant_pool_leader_rejected",
    label: "Pool Leader Application Rejected (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their Testing Pool Leader application is rejected.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `❌ <b>Pool Leader Application Unsuccessful</b>\n\nHi @{{username}}, unfortunately your application to become a Testing Pool Leader has not been approved at this time.\n\nIf you have questions, please reach out to support.\n\n<a href="{{app_url}}">Visit the site →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "applicant_reshipper_approved",
    label: "Reshipper Application Approved (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their Reshipper application is approved.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `✅ <b>Reshipper Application Approved!</b>\n\nCongratulations, @{{username}}! Your application to become a Reshipper has been approved.\n\nYou can now assist with reshipping orders on the platform.\n\n<a href="{{app_url}}">Get started →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "applicant_reshipper_rejected",
    label: "Reshipper Application Rejected (Applicant)",
    audience: "customer",
    prefKey: "role_application",
    description: "Sent to the applicant when their Reshipper application is rejected.",
    placeholders: ["username", "app_url"],
    defaultTemplate:
      `❌ <b>Reshipper Application Unsuccessful</b>\n\nHi @{{username}}, unfortunately your application to become a Reshipper has not been approved at this time.\n\nIf you have questions, please reach out to support.\n\n<a href="{{app_url}}">Visit the site →</a>`,
    editableInAdmin: true,
  },
  // ── Bot interactive messages ─────────────────────────────────────────────────
  // Account linking
  {
    eventKey: "bot_not_linked",
    label: "Not Linked Warning",
    audience: "bot",
    prefKey: null,
    description: "Shown when an unlinked user tries to use a feature that requires an account (orders, group buys, tickets).",
    placeholders: [],
    defaultTemplate:
      `⚠️ Your Telegram isn't linked to an account yet.\n\nSend <b>/start</b> for setup instructions.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_no_account_linked",
    label: "No Account Linked",
    audience: "bot",
    prefKey: null,
    description: "Shown when a user sends /stop or /unlink but has no account linked to their chat.",
    placeholders: [],
    defaultTemplate: `No account is currently linked to this chat.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_no_code",
    label: "/link — No Code Provided",
    audience: "bot",
    prefKey: null,
    description: "Shown when a user sends /link without a code.",
    placeholders: [],
    defaultTemplate:
      `ℹ️ Send your link code like this:\n\n<code>/link XXXXXX</code>\n\nGet the code from the <b>Telegram Notifications</b> section of your Profile Hub.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_invalid_code",
    label: "/link — Invalid Code Format",
    audience: "bot",
    prefKey: null,
    description: "Shown when the code provided with /link doesn't match the expected format.",
    placeholders: [],
    defaultTemplate:
      `❌ That doesn't look like a valid link code. Codes are 8 characters long, like <code>/link A1B2C3D4</code>.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_already_used",
    label: "/link — Code Already Used",
    audience: "bot",
    prefKey: null,
    description: "Shown when a user tries a code that has already been consumed.",
    placeholders: [],
    defaultTemplate: `✅ This code has already been used — your Telegram is already linked.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_not_found",
    label: "/link — Code Not Recognised",
    audience: "bot",
    prefKey: null,
    description: "Shown when the link code doesn't match any account.",
    placeholders: [],
    defaultTemplate:
      `❌ Link code not recognised. Generate a fresh code from <b>Telegram Notifications</b> in your Profile Hub.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_expired",
    label: "/link — Code Expired",
    audience: "bot",
    prefKey: null,
    description: "Shown when the link code has passed its 15-minute expiry.",
    placeholders: [],
    defaultTemplate:
      `❌ This link code has expired (codes are valid for 15 minutes). Please generate a new one.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_link_success",
    label: "/link — Linked Successfully",
    audience: "bot",
    prefKey: null,
    description: "Sent after a successful /link. {{username}} is the Telegram username just linked.",
    placeholders: ["username"],
    defaultTemplate:
      `✅ <b>Linked!</b> Your Telegram is now connected to @{{username}}.\n\nUse the menu above to check orders, tracking, group buys, lab reports, and more. Send <b>/menu</b> any time to bring it back.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_unlinked",
    label: "/stop — Unlinked Successfully",
    audience: "bot",
    prefKey: null,
    description: "Sent after a user successfully unlinks their Telegram with /stop.",
    placeholders: [],
    defaultTemplate: `✅ Your Telegram has been unlinked.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_cancel",
    label: "/cancel — Action Cancelled",
    audience: "bot",
    prefKey: null,
    description: "Sent when a user cancels an in-progress conversation flow.",
    placeholders: [],
    defaultTemplate: `Cancelled. Send <b>/menu</b> to go back to the main menu.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_awaiting_buttons",
    label: "Awaiting Button Press",
    audience: "bot",
    prefKey: null,
    description: "Shown when a user sends text during a step that expects them to tap a button (e.g. selecting a ticket category).",
    placeholders: [],
    defaultTemplate:
      `Please tap one of the buttons above to continue, or send /cancel to start over.`,
    editableInAdmin: true,
  },
  // Orders flow
  {
    eventKey: "bot_orders_header",
    label: "My Orders — List",
    audience: "bot",
    prefKey: null,
    description: "Wraps the list of recent orders. {{lines}} is the order list, {{app_url}} is the site URL.",
    placeholders: ["lines", "app_url"],
    defaultTemplate:
      `📦 <b>Your recent orders</b>\n\n{{lines}}\n\n<a href="{{app_url}}/lookup">View all orders →</a>`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_orders_empty",
    label: "My Orders — No Orders",
    audience: "bot",
    prefKey: null,
    description: "Shown when a linked user has no orders.",
    placeholders: ["app_url"],
    defaultTemplate:
      `📦 You don't have any orders yet.\n\n<a href="{{app_url}}">Browse the shop →</a>`,
    editableInAdmin: true,
  },
  // Tracking flow
  {
    eventKey: "bot_tracking_header",
    label: "Tracking — Parcel List",
    audience: "bot",
    prefKey: null,
    description: "Wraps the list of tracked parcels. {{lines}} is the parcel list.",
    placeholders: ["lines"],
    defaultTemplate: `🚚 <b>Your tracked parcels</b>\n\n{{lines}}`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_tracking_empty",
    label: "Tracking — No Parcels",
    audience: "bot",
    prefKey: null,
    description: "Shown when the user has no active parcel tracking opt-ins.",
    placeholders: [],
    defaultTemplate:
      `🚚 You aren't subscribed to any parcel updates yet.\n\nWhen a reshipper dispatches your package, you'll receive a message with a <b>Yes, notify me</b> button.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_tracking_status_update",
    label: "Tracking — Auto Status Update",
    audience: "bot",
    prefKey: null,
    description: "Sent automatically when a parcel status changes (e.g. In Transit → Out for Delivery). {{emoji}} {{gb_name}} {{label}} {{status_label}} {{tracking_line}} (tracking_line = empty or newline + masked number).",
    placeholders: ["emoji", "gb_name", "label", "status_label", "tracking_line"],
    defaultTemplate:
      `{{emoji}} <b>{{gb_name}}</b> — <b>{{label}}</b>\nStatus: <b>{{status_label}}</b>{{tracking_line}}`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_parcel_optin_yes",
    label: "Tracking Opt-in — Confirmed",
    audience: "bot",
    prefKey: null,
    description: "Sent when a user taps 'Yes, notify me' for a parcel. {{label}} is the parcel name.",
    placeholders: ["label"],
    defaultTemplate: `✅ Done! You'll get tracking updates for <b>{{label}}</b> right here.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_parcel_optin_no",
    label: "Tracking Opt-in — Declined",
    audience: "bot",
    prefKey: null,
    description: "Sent when a user taps 'No thanks' for a parcel. {{label}} is the parcel name.",
    placeholders: ["label"],
    defaultTemplate: `❌ OK, no updates for <b>{{label}}</b>.`,
    editableInAdmin: true,
  },
  // Group buys flow
  {
    eventKey: "bot_gbs_header",
    label: "My Group Buys — List",
    audience: "bot",
    prefKey: null,
    description: "Wraps the list of group buys the user has joined. {{lines}} is the GB list.",
    placeholders: ["lines"],
    defaultTemplate: `🌍 <b>Your group buys</b>\n\n{{lines}}`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_gbs_empty",
    label: "My Group Buys — None Joined",
    audience: "bot",
    prefKey: null,
    description: "Shown when a linked user hasn't joined any group buys.",
    placeholders: ["app_url"],
    defaultTemplate:
      `🌍 You haven't joined any group buys yet.\n\n<a href="{{app_url}}/groups">Browse group buys →</a>`,
    editableInAdmin: true,
  },
  // Lab reports flow
  {
    eventKey: "bot_labs_header",
    label: "Lab Reports — Recent List",
    audience: "bot",
    prefKey: null,
    description: "Wraps the recent lab reports list. {{lines}} is the report list.",
    placeholders: ["lines"],
    defaultTemplate: `🧪 <b>Recent lab reports</b>\n\n{{lines}}`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_labs_empty",
    label: "Lab Reports — None Available",
    audience: "bot",
    prefKey: null,
    description: "Shown when there are no approved lab reports in the database.",
    placeholders: [],
    defaultTemplate: `🧪 No lab reports available yet.`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_labs_search_results",
    label: "Lab Reports — Search Results Header",
    audience: "bot",
    prefKey: null,
    description: "Header shown above lab search results. {{query}} is the search term, {{lines}} is the result list.",
    placeholders: ["query", "lines"],
    defaultTemplate: `🧪 <b>Results for "{{query}}"</b>`,
    editableInAdmin: true,
  },
  // Reshipper dispatch opt-in notification
  {
    eventKey: "bot_reshipper_dispatch_optin",
    label: "Reshipper — Dispatch Notification to Members",
    audience: "bot",
    prefKey: null,
    description: "Sent to group buy members when a reshipper marks a parcel as dispatched. {{gb_name}} {{parcel_label}} {{items_line}} {{note_line}} are substituted in code.",
    placeholders: ["gb_name", "parcel_label", "items_line", "note_line"],
    defaultTemplate:
      `🚚 <b>{{parcel_label}}</b> has been dispatched!{{items_line}}{{note_line}}\n\nDo you want to receive shipping updates through the bot?`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_start_unlinked",
    label: "/start — Welcome (not yet linked)",
    audience: "bot",
    prefKey: null,
    description: "Shown when someone sends /start but hasn't linked their account yet.",
    placeholders: ["app_url"],
    defaultTemplate:
      `👋 <b>Welcome to Salt &amp; Peps!</b>\n\nLink your account to access orders, tracking, group buys, lab reports, and support — all right here in Telegram.\n\n<b>How to link:</b>\n1. Open your Profile Hub on the site\n2. Go to <b>Telegram Notifications</b>\n3. Tap <b>Link Telegram</b> to get a code\n4. Send <code>/link YOUR_CODE</code> here`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_menu_header",
    label: "Main Menu — Header",
    audience: "bot",
    prefKey: null,
    description: "The message shown when the main menu is displayed. {{username}} is the Telegram username.",
    placeholders: ["username"],
    defaultTemplate:
      `🌟 <b>Salt &amp; Peps — Main Menu</b>\n\nHey @{{username}}! What can we help you with today?`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_help",
    label: "/help — Command Reference",
    audience: "bot",
    prefKey: null,
    description: "Shown when a linked user taps Help or sends /help.",
    placeholders: [],
    defaultTemplate:
      `❓ <b>Available commands</b>\n\n<b>/menu</b> — Open the main menu\n<b>/link CODE</b> — Link your account\n<b>/support</b> — Open a support ticket\n<b>/cancel</b> — Cancel current action\n<b>/stop</b> — Unlink your Telegram\n\n<i>Tap any button in the menu above or send a message and our AI will try to help.</i>`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_labs_search_prompt",
    label: "Lab Reports — Search Prompt",
    audience: "bot",
    prefKey: null,
    description: "Shown when the user taps the Search button in lab reports.",
    placeholders: [],
    defaultTemplate:
      `🔍 <b>Search lab reports</b>\n\nType a <b>compound name</b> or <b>batch code</b> and I'll find matching results.\n\n<i>e.g. BPC-157 or SNP-A012</i>`,
    editableInAdmin: true,
  },
  {
    eventKey: "bot_labs_no_results",
    label: "Lab Reports — No Results",
    audience: "bot",
    prefKey: null,
    description: "Shown when a lab report search returns no matches.",
    placeholders: ["query"],
    defaultTemplate:
      `🧪 No lab reports found for <b>{{query}}</b>.\n\nTry a different compound name or batch code.`,
    editableInAdmin: true,
  },
  // ── QR upload reminder ──────────────────────────────────────────────────────
  {
    eventKey: "customer_qr_upload_reminder",
    label: "QR Code Upload Reminder (Customer)",
    audience: "customer",
    prefKey: "status",
    description: "Sent to a customer asking them to upload their InPost QR code after their order has been dispatched to the reshipper.",
    placeholders: ["code", "username", "gb_name", "app_url"],
    defaultTemplate:
      `📦 <b>Action Required: Upload Your QR Code</b>\n\nHi <b>@{{username}}</b>, your order <code>#{{code}}</code> from <b>{{gb_name}}</b> has been dispatched!\n\nPlease log in and upload your InPost QR code so it's ready for collection.\n\n<a href="{{app_url}}/account">Upload your QR code →</a>`,
    editableInAdmin: true,
  },
  // ── Reshipper notifications ─────────────────────────────────────────────────
  {
    eventKey: "reshipper_force_assigned",
    label: "Force-Assigned Order (Reshipper)",
    audience: "reshipper",
    prefKey: "status",
    description: "Sent to a reshipper when an admin or organiser manually force-assigns an order to them.",
    placeholders: ["code", "customer_username", "shipping_country"],
    defaultTemplate:
      `📦 <b>Order Assigned to You</b>\n\nYou have been manually assigned order <code>#{{code}}</code>.\n\nCustomer: @{{customer_username}}\nShipping Country: {{shipping_country}}\n\n⚠️ <i>Note: this is a manual override by an admin or organiser.</i>`,
    editableInAdmin: true,
  },
];

/** Fast lookup by eventKey */
export const REGISTRY_MAP = new Map(TEMPLATE_REGISTRY.map(e => [e.eventKey, e]));
