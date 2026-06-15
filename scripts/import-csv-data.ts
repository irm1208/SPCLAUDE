import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanStr(val: string | undefined): string | null {
  if (val === undefined || val === null || val === "") return null;
  return val.replace(/^"+|"+$/g, "").trim() || null;
}

function cleanBool(val: string | undefined): boolean | null {
  if (val === undefined || val === null || val === "") return null;
  const v = val.replace(/^"+|"+$/g, "").trim();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function cleanNum(val: string | undefined): string | null {
  if (val === undefined || val === null || val === "") return null;
  return val.replace(/^"+|"+$/g, "").trim() || null;
}

function cleanJson(val: string | undefined): object | null {
  if (val === undefined || val === null || val === "") return null;
  try {
    const s = val.replace(/^"+|"+$/g, "").trim();
    const unescaped = s.replace(/""/g, '"');
    return JSON.parse(unescaped);
  } catch {
    return null;
  }
}

async function run() {
  const client = await pool.connect();
  try {
    console.log("Starting CSV data import...\n");

    // 1. Delivery methods
    console.log("Importing delivery_methods...");
    const deliveryMethods = [
      { id: "dm-inpost", name: "InPost", price: "3.00", active: true, sort_order: 2 },
      { id: "dm-international", name: "International", price: "8.50", active: false, sort_order: 3 },
      { id: "dm-royal-mail", name: "Royal Mail", price: "10.00", active: true, sort_order: 1 },
    ];
    for (const row of deliveryMethods) {
      await client.query(
        `INSERT INTO delivery_methods (id, name, price, active, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2, price=$3, active=$4, sort_order=$5, updated_at=NOW()`,
        [row.id, row.name, row.price, row.active, row.sort_order]
      );
    }
    console.log(`  -> ${deliveryMethods.length} rows`);

    // 2. Group buys
    console.log("Importing group_buys...");
    const groupBuys = [
      {
        id: "1794d939-ca34-40f9-b2e0-d6777482f040",
        name: "Uther GB",
        description: "Uther",
        status: "active",
        close_date: "2026-04-22T00:00:00.000Z",
        invite_pin_hash: null,
        manufacturer: "Uther",
        manufacturer_country: null,
        info_cards: null,
        currency: "USD",
        sort_order: null,
        created_at: "2026-04-06T08:17:56.675Z",
        updated_at: "2026-04-06T08:17:56.675Z",
      },
    ];
    for (const row of groupBuys) {
      await client.query(
        `INSERT INTO group_buys (id, name, description, status, close_date, invite_pin_hash, manufacturer, manufacturer_country, info_cards, currency, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.name, row.description, row.status, row.close_date, row.invite_pin_hash, row.manufacturer, row.manufacturer_country, row.info_cards, row.currency, row.sort_order, row.created_at, row.updated_at]
      );
    }
    console.log(`  -> ${groupBuys.length} rows`);

    // 3. Accounts
    console.log("Importing accounts...");
    // password_hash values are intentionally omitted for security.
    // Imported accounts will have no password and must use the password-reset flow.
    const accounts = [
      { telegram_username: "atzz_mm", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T17:48:14.148Z", updated_at: "2026-03-24T17:48:14.148Z" },
      { telegram_username: "fergmcferg", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T09:39:36.740Z", updated_at: "2026-03-24T09:39:36.740Z" },
      { telegram_username: "hotlinerider", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-25T09:21:19.460Z", updated_at: "2026-03-25T09:21:19.460Z" },
      { telegram_username: "iam0121", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-04-05T14:08:11.322Z", updated_at: "2026-04-05T14:08:11.322Z" },
      { telegram_username: "ironmanjamie", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T06:59:09.254Z", updated_at: "2026-03-24T06:59:09.254Z" },
      { telegram_username: "jack3797", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-25T07:28:22.276Z", updated_at: "2026-03-25T07:28:22.276Z" },
      { telegram_username: "jbonwards", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T14:23:42.010Z", updated_at: "2026-03-24T14:23:42.010Z" },
      { telegram_username: "sicoted", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T20:40:45.923Z", updated_at: "2026-03-24T20:40:45.923Z" },
      { telegram_username: "simonayybee", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T18:07:30.730Z", updated_at: "2026-03-24T18:07:30.730Z" },
      { telegram_username: "untamedchazy", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-25T04:36:03.131Z", updated_at: "2026-03-25T04:36:03.131Z" },
      { telegram_username: "vasendak", password_hash: null, email: null, account_status: "active", health_data_consent: false, created_at: "2026-03-24T13:59:07.000Z", updated_at: "2026-03-24T13:59:07.000Z" },
    ];
    const defaultNotifs = { status: true, deleted: true, payment: true, profile: true, new_order: true };
    for (const row of accounts) {
      await client.query(
        `INSERT INTO accounts (telegram_username, password_hash, email, account_status, telegram_notifications, health_data_consent, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (telegram_username) DO NOTHING`,
        [row.telegram_username, row.password_hash, row.email, row.account_status, JSON.stringify(defaultNotifs), row.health_data_consent, row.created_at, row.updated_at]
      );
    }
    console.log(`  -> ${accounts.length} rows`);

    // 4. Orders (must come before order_line_items)
    console.log("Importing orders...");
    const orders = [
      { id: "03a194ac-176f-45d5-9f81-6a28e7f17c0c", code: "0027", telegram_username: "@S S C", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "491.00", tip: "0.00", grand_total: "494.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.032Z", updated_at: "2026-03-30T15:48:05.932Z" },
      { id: "0581d320-40f1-40e7-9adb-cd05ffaabda1", code: "0025", telegram_username: "Fergus", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "480.00", tip: "0.00", grand_total: "490.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.021Z", updated_at: "2026-03-24T09:55:39.914Z" },
      { id: "05edc6e3-04b1-4487-bdda-898348202bfb", code: "0035", telegram_username: "@hotlinerider", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "575.00", tip: "0.00", grand_total: "585.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.074Z", updated_at: "2026-04-01T01:09:58.169Z" },
      { id: "17b2c399-9bba-4740-8b1e-751b5baaa252", code: "0011", telegram_username: "@J4mes_R", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "717.50", tip: "0.00", grand_total: "727.50", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.940Z", updated_at: "2026-03-21T13:13:46.284Z" },
      { id: "1b975899-08c0-439c-b0bb-b65f0092d0aa", code: "0013", telegram_username: "@zebble76", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "180.00", tip: "0.00", grand_total: "190.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.951Z", updated_at: "2026-04-02T20:00:02.025Z" },
      { id: "1c6f6f7f-e7bd-4124-bc95-87988338970c", code: "6064", telegram_username: "@test8689", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "65.00", tip: "0.00", grand_total: "75.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1786", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T11:32:21.523Z", updated_at: "2026-03-20T11:32:44.702Z" },
      { id: "208c5098-466d-41e8-9f75-0218fbf1db3f", code: "0023", telegram_username: "@JB Adipo", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "450.00", tip: "0.00", grand_total: "453.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.010Z", updated_at: "2026-03-18T20:20:09.010Z" },
      { id: "2b5c150d-a993-40be-9e5a-8c284157a010", code: "9904", telegram_username: "@j_p_b8_2", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "95.00", tip: "0.00", grand_total: "105.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1982", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-22T08:34:18.670Z", updated_at: "2026-03-22T08:34:18.670Z" },
      { id: "387da382-1cae-4e68-a960-1241775d3493", code: "5154", telegram_username: "@pink ladybug", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "450.00", tip: "0.00", grand_total: "460.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "3309", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T22:56:00.929Z", updated_at: "2026-03-20T22:56:00.929Z" },
      { id: "3a5df063-138c-4498-bef2-6d733ca93ea2", code: "0009", telegram_username: "@jakeh1992", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "195.00", tip: "0.00", grand_total: "205.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.927Z", updated_at: "2026-03-20T11:12:28.081Z" },
      { id: "3b7280a7-b855-489a-b9d1-b2f03e5f3d0b", code: "0030", telegram_username: "@josie_uk", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "220.00", tip: "0.00", grand_total: "230.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.048Z", updated_at: "2026-03-29T15:20:55.193Z" },
      { id: "3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4", code: "0003", telegram_username: "UntamedChazy", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "930.00", tip: "0.00", grand_total: "940.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.887Z", updated_at: "2026-03-20T07:01:27.084Z" },
      { id: "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", code: "0042", telegram_username: "Leonidas", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "435.00", tip: "0.00", grand_total: "445.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.105Z", updated_at: "2026-03-21T13:11:17.148Z" },
      { id: "4e4a3e91-871e-4486-8b8e-828a75cd40f1", code: "5168", telegram_username: "@grundlefly1", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "255.00", tip: "0.00", grand_total: "258.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "9071", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-29T10:36:06.640Z", updated_at: "2026-03-29T13:30:58.226Z" },
      { id: "56b0fc96-fb0a-4894-90e6-b0155adc13b2", code: "6056", telegram_username: "@ironmanjamie", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1077.50", tip: "0.00", grand_total: "1087.50", notes: "Splitting TA-1 with @Carpediem831", status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "3535", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-25T14:56:25.555Z", updated_at: "2026-03-25T14:56:25.555Z" },
      { id: "6005ce00-0b76-4cc5-80ee-3597213a8c66", code: "6730", telegram_username: "@andyt2888", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "210.00", tip: "0.00", grand_total: "220.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1793", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-22T17:06:11.913Z", updated_at: "2026-03-22T21:00:02.728Z" },
      { id: "6493de23-d80d-4537-b304-cbebf95d59d6", code: "3176", telegram_username: "@dmacd9", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "120.00", tip: "0.00", grand_total: "123.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1477", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-22T13:46:23.888Z", updated_at: "2026-03-22T13:46:23.888Z" },
      { id: "68c55da7-3de1-4de5-9819-c6ec3c35849e", code: "7883", telegram_username: "@lewrollz", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "165.00", tip: "0.00", grand_total: "175.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "2712", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T08:56:02.611Z", updated_at: "2026-03-20T08:56:02.611Z" },
      { id: "6f6de2e0-09fd-4ba9-a538-07683263fd23", code: "0017", telegram_username: "Scott", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "310.00", tip: "0.00", grand_total: "320.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.976Z", updated_at: "2026-03-20T07:23:32.365Z" },
      { id: "73984bec-7961-4a99-9f63-fe38ebe2acc5", code: "6582", telegram_username: "@prem_peps", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "247.00", tip: "0.00", grand_total: "250.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "7858", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T11:53:09.555Z", updated_at: "2026-03-21T10:50:54.032Z" },
      { id: "7522e0b8-cf16-40ef-aff9-9b3180098433", code: "0024", telegram_username: "@ADev81", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "325.00", tip: "0.00", grand_total: "335.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.016Z", updated_at: "2026-03-29T22:49:15.872Z" },
      { id: "7afcf931-ee91-4892-9f9a-aaf8b254e5d5", code: "5237", telegram_username: "@scott", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1231.00", tip: "0.00", grand_total: "1241.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1234", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-21T13:04:31.593Z", updated_at: "2026-03-27T17:00:58.868Z" },
      { id: "7c4198b0-56ca-4561-a79e-9b04debe3cf9", code: "3733", telegram_username: "@wefewfwf", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "80.00", tip: "0.00", grand_total: "90.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-19T17:02:22.401Z", updated_at: "2026-03-19T23:23:29.834Z" },
      { id: "7d6339fe-0e7e-4f13-a613-9964a321e863", code: "0037", telegram_username: "FBX2000", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "0.00", vendor_shipping: "0.00", product_subtotal: "85.00", tip: "0.00", grand_total: "85.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.084Z", updated_at: "2026-03-18T20:20:09.084Z" },
      { id: "813442f1-cfc6-45bc-9a82-3d1a63068328", code: "0029", telegram_username: "@noshoesnoservice", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "160.00", tip: "0.00", grand_total: "163.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.043Z", updated_at: "2026-03-18T20:20:09.043Z" },
      { id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", code: "0034", telegram_username: "@Jayjo8", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "751.00", tip: "0.00", grand_total: "761.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.069Z", updated_at: "2026-04-02T16:46:03.847Z" },
      { id: "872ee5ff-b754-4068-ad98-c7c06c86e42d", code: "0033", telegram_username: "Lizzie2391", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "135.00", tip: "0.00", grand_total: "145.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.065Z", updated_at: "2026-03-18T20:20:09.065Z" },
      { id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", code: "0016", telegram_username: "@kenupfront", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1876.00", tip: "0.00", grand_total: "1886.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.968Z", updated_at: "2026-04-01T14:14:29.249Z" },
      { id: "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", code: "0031", telegram_username: "@Nemo", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "0.00", vendor_shipping: "0.00", product_subtotal: "121.00", tip: "0.00", grand_total: "121.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.054Z", updated_at: "2026-03-21T06:31:03.289Z" },
      { id: "a22f7966-b42d-4cab-81c3-c94983f0e590", code: "0040", telegram_username: "Shaida Ali", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "431.00", tip: "0.00", grand_total: "441.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.100Z", updated_at: "2026-03-18T20:20:09.100Z" },
      { id: "a434d697-4ad9-481d-8b13-74d343cd9590", code: "0036", telegram_username: "@Zii", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "51.00", tip: "0.00", grand_total: "61.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.079Z", updated_at: "2026-03-22T07:26:33.433Z" },
      { id: "a4cab9d2-7cb6-4f24-baa6-208f41bad4ca", code: "0005", telegram_username: "finguk", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "95.00", tip: "0.00", grand_total: "105.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.903Z", updated_at: "2026-03-18T20:20:08.903Z" },
      { id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", code: "0022", telegram_username: "Mand", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1231.00", tip: "0.00", grand_total: "1241.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.003Z", updated_at: "2026-03-20T06:59:24.230Z" },
      { id: "b096c66d-5870-4010-9511-45e13727908c", code: "0020", telegram_username: "OJ", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "250.00", tip: "0.00", grand_total: "260.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.991Z", updated_at: "2026-03-18T20:20:08.991Z" },
      { id: "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", code: "0039", telegram_username: "@vasendak", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "165.00", tip: "0.00", grand_total: "175.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.094Z", updated_at: "2026-04-01T13:02:52.881Z" },
      { id: "b3a84822-5580-47c7-bfe0-7b61f1908c05", code: "8148", telegram_username: "@5egergfr", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "122.50", tip: "0.00", grand_total: "132.50", notes: null, status: "Submitted", admin_notes: null, admin_message: "does this work", tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1786", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-19T17:00:15.099Z", updated_at: "2026-03-19T17:02:08.563Z" },
      { id: "bb1c75a0-a705-4887-9f13-38ed114c6af3", code: "2164", telegram_username: "@entangledpep", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "85.00", tip: "0.00", grand_total: "95.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "confirmed", payment_tx_hash: "0x551253d4667ab3dfb6736686c8599a6102166cb847b851d62e797287df0dfcf1", payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0123", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T22:19:09.278Z", updated_at: "2026-03-18T23:17:30.914Z" },
      { id: "bd3ef131-5462-4867-b158-096b0ab8ccf3", code: "6399", telegram_username: "@1poundfish", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "211.00", tip: "0.00", grand_total: "221.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "9213", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T17:58:17.518Z", updated_at: "2026-04-01T10:37:35.605Z" },
      { id: "bfd2166a-c2df-46bd-a127-570af936afc7", code: "0018", telegram_username: "Scottish_Basdurt", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "480.00", tip: "0.00", grand_total: "490.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.981Z", updated_at: "2026-03-18T20:20:08.981Z" },
      { id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", code: "0007", telegram_username: "@JohnnyWalker70", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "755.00", tip: "0.00", grand_total: "765.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.914Z", updated_at: "2026-03-21T17:27:17.963Z" },
      { id: "c310cffd-47c0-4225-ade9-62923897b77f", code: "0004", telegram_username: "1poundfish", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "205.00", tip: "0.00", grand_total: "215.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.895Z", updated_at: "2026-03-18T20:20:08.895Z" },
      { id: "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", code: "2248", telegram_username: "@untamedchazy", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "965.00", tip: "0.00", grand_total: "975.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "6790", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-21T07:56:05.214Z", updated_at: "2026-03-22T21:07:38.289Z" },
      { id: "c67237d3-15ca-4487-b138-43c30d2e1df0", code: "0001", telegram_username: "@Reeper90", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1120.00", tip: "0.00", grand_total: "1130.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.872Z", updated_at: "2026-03-20T06:18:26.459Z" },
      { id: "c675f7ec-5f9d-436a-afbd-fff7a1d4621a", code: "0015", telegram_username: "@OC1313", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "165.00", tip: "0.00", grand_total: "175.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.962Z", updated_at: "2026-03-20T05:41:24.440Z" },
      { id: "cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca", code: "0026", telegram_username: "mick", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "445.00", tip: "0.00", grand_total: "455.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.027Z", updated_at: "2026-03-18T20:20:09.027Z" },
      { id: "d25da38b-20aa-40ff-ba34-e1638b380836", code: "0019", telegram_username: "Pink ladybug", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "1282.50", tip: "0.00", grand_total: "1292.50", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.986Z", updated_at: "2026-03-18T20:20:08.986Z" },
      { id: "d9eff3e7-6d9b-4aac-a009-c49b0299b99c", code: "0006", telegram_username: "@slimsimma", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "0.00", vendor_shipping: "0.00", product_subtotal: "202.50", tip: "0.00", grand_total: "202.50", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.909Z", updated_at: "2026-03-20T07:44:55.238Z" },
      { id: "e00b0557-6024-42ab-826c-31d5da1e3674", code: "0038", telegram_username: "@K_andL", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "75.00", tip: "0.00", grand_total: "85.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.089Z", updated_at: "2026-03-20T16:57:42.101Z" },
      { id: "e8b38f59-85d4-4c03-9581-eca90f3bf35f", code: "0021", telegram_username: "@HAGRIDV99", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "185.00", tip: "0.00", grand_total: "195.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.998Z", updated_at: "2026-03-18T20:20:08.998Z" },
      { id: "ece1625b-f1c1-48fc-827c-9a5978560ac7", code: "0043", telegram_username: "Clarke", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "0.00", vendor_shipping: "0.00", product_subtotal: "35.00", tip: "0.00", grand_total: "35.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.110Z", updated_at: "2026-03-20T11:20:36.825Z" },
      { id: "ed8e0967-57d6-421d-906e-8ca68e8cc3ba", code: "0032", telegram_username: "@NeverEvenSeenIt", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "160.00", tip: "0.00", grand_total: "170.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.059Z", updated_at: "2026-03-20T07:29:00.256Z" },
      { id: "ef424a02-1925-4f55-949b-4b714f5c7cbc", code: "7884", telegram_username: "@carpediem831", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "412.50", tip: "0.00", grand_total: "422.50", notes: "Sharing with Jamie Gregory", status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1127", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-24T10:34:43.018Z", updated_at: "2026-03-28T19:56:43.676Z" },
      { id: "f26795ea-efe8-45fb-9cee-f80d3c69f704", code: "4551", telegram_username: "@testing", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "90.00", tip: "0.00", grand_total: "93.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "1786", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-19T21:33:22.807Z", updated_at: "2026-03-19T21:33:22.807Z" },
      // Last 9 from CSV
      { id: "f390e78f-35ca-4021-a236-a0c36532a061", code: "5826", telegram_username: "@mkp_uk", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "243.00", tip: "0.00", grand_total: "246.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "5677", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T10:53:57.654Z", updated_at: "2026-03-20T10:53:57.654Z" },
      { id: "f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93", code: "8583", telegram_username: "@mkp_uk", delivery_method: "InPost", delivery_method_id: "dm-inpost", delivery_price: "3.00", vendor_shipping: "0.00", product_subtotal: "120.00", tip: "0.00", grand_total: "123.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "5677", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-27T13:20:48.831Z", updated_at: "2026-03-27T13:20:48.831Z" },
      { id: "f7a805fd-f97e-4689-a011-2737dadc372f", code: "0008", telegram_username: "@panth89", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "285.00", tip: "0.00", grand_total: "295.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.921Z", updated_at: "2026-03-18T20:20:08.921Z" },
      { id: "f7ad2e8d-85c8-40f5-b209-089b571acdad", code: "0028", telegram_username: "@atzz_mm", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "385.00", tip: "0.00", grand_total: "395.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.037Z", updated_at: "2026-03-30T19:37:22.883Z" },
      { id: "fb87ced5-8e31-4eaf-a3cd-64cba23b3188", code: "0002", telegram_username: "@carpediem831", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "798.00", tip: "0.00", grand_total: "808.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.879Z", updated_at: "2026-03-18T20:20:08.879Z" },
      { id: "feacea3c-d137-4fb2-8955-2f154947b317", code: "0010", telegram_username: "@Clarke", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "330.00", tip: "0.00", grand_total: "340.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:08.930Z", updated_at: "2026-03-20T13:23:13.815Z" },
      { id: "d6cb9628-82e3-42e1-a9b0-7dc044c79837", code: "9360", telegram_username: "@ploddingalong", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "961.00", tip: "0.00", grand_total: "971.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-27T13:37:54.381Z", updated_at: "2026-03-27T13:37:54.381Z" },
      { id: "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", code: "3169", telegram_username: "@ploddingalong", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "155.00", tip: "0.00", grand_total: "165.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-26T13:55:07.935Z", updated_at: "2026-03-26T13:55:07.935Z" },
      { id: "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", code: "6130", telegram_username: "@JohnCenaCMe", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "395.00", tip: "0.00", grand_total: "405.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-20T12:11:20.841Z", updated_at: "2026-03-20T12:11:20.841Z" },
      { id: "83a3d960-ba23-47a3-883c-ed6883ab9d28", code: "0041", telegram_username: "@sicoted", delivery_method: "Royal Mail", delivery_method_id: "dm-royal-mail", delivery_price: "10.00", vendor_shipping: "0.00", product_subtotal: "210.00", tip: "0.00", grand_total: "220.00", notes: null, status: "Submitted", admin_notes: null, admin_message: null, tracking_number: null, payment_status: "unpaid", payment_tx_hash: null, payment_test_amount: null, test_payment_tx_hash: null, shipping_name: null, shipping_address: null, pin: "0000", inpost_qr_code: null, group_buy_id: null, created_at: "2026-03-18T20:20:09.069Z", updated_at: "2026-03-18T20:20:09.069Z" },
    ];
    for (const row of orders) {
      await client.query(
        `INSERT INTO orders (id, code, telegram_username, delivery_method, delivery_method_id, delivery_price, vendor_shipping, product_subtotal, tip, grand_total, notes, status, admin_notes, admin_message, tracking_number, payment_status, payment_tx_hash, payment_test_amount, test_payment_tx_hash, shipping_name, shipping_address, pin, inpost_qr_code, group_buy_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.code, row.telegram_username, row.delivery_method, row.delivery_method_id, row.delivery_price, row.vendor_shipping, row.product_subtotal, row.tip, row.grand_total, row.notes, row.status, row.admin_notes, row.admin_message, row.tracking_number, row.payment_status, row.payment_tx_hash, row.payment_test_amount, row.test_payment_tx_hash, row.shipping_name, row.shipping_address, row.pin, row.inpost_qr_code, row.group_buy_id, row.created_at, row.updated_at]
      );
    }
    console.log(`  -> ${orders.length} rows`);

    // 5. Order line items
    console.log("Importing order_line_items...");
    const orderLineItems = [
      { id: "00c14223-3de3-40a3-b32b-f963766b3ff2", order_id: "3f1e6f0a-d1fa-474e-a8ea-68c90fc1d9a1", product_id: "p012", product_name: "Retatrutide 40mg", quantity: "1.00", unit_price: "165.00", line_total: "165.00", created_at: "2026-03-18T20:20:09.108Z" },
      { id: "01cdf7bc-2785-4519-945d-08aaca1e740d", order_id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", product_id: "p028", product_name: "Adipotide 10mg", quantity: "1.00", unit_price: "165.00", line_total: "165.00", created_at: "2026-04-02T16:46:03.959Z" },
      { id: "045bd1a3-13a9-4aec-83a2-1ad79d067cc8", order_id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", product_id: "p057", product_name: "Ipamorelin 10mg", quantity: "1.00", unit_price: "80.00", line_total: "80.00", created_at: "2026-03-18T20:20:08.973Z" },
      { id: "05682c6d-b998-4d99-bdcf-68b8c5ea951e", order_id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", product_id: "p058", product_name: "Thymosin Alpha-1 10mg", quantity: "1.00", unit_price: "125.00", line_total: "125.00", created_at: "2026-04-01T14:14:29.360Z" },
      { id: "059f8ec1-1839-4ffb-a69a-26cc2dda10ae", order_id: "17b2c399-9bba-4740-8b1e-751b5baaa252", product_id: "p110", product_name: "Cortagen 20mg", quantity: "0.50", unit_price: "120.00", line_total: "60.00", created_at: "2026-03-18T20:20:08.942Z" },
      { id: "06b2e768-c30a-47e4-a991-2ad7096f205d", order_id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", product_id: "p020", product_name: "GAC water 3ml", quantity: "1.00", unit_price: "15.00", line_total: "15.00", created_at: "2026-03-18T20:20:08.917Z" },
      { id: "085e0a8b-7508-42ff-b882-fbac4555c93e", order_id: "c67237d3-15ca-4487-b138-43c30d2e1df0", product_id: "p039", product_name: "Epitalon 10mg", quantity: "2.00", unit_price: "45.00", line_total: "90.00", created_at: "2026-03-18T20:20:08.877Z" },
      { id: "0aea270a-88f9-463b-96b5-d8c44e08d2a5", order_id: "f390e78f-35ca-4021-a236-a0c36532a061", product_id: "p010", product_name: "Retatrutide 20mg", quantity: "1.00", unit_price: "120.00", line_total: "120.00", created_at: "2026-03-20T06:50:33.892Z" },
      { id: "0c322c29-3763-455b-abbf-d4fb4123d9d5", order_id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", product_id: "p085", product_name: "KPV 30mg", quantity: "0.50", unit_price: "145.00", line_total: "72.50", created_at: "2026-03-18T20:20:09.007Z" },
      { id: "0e0adf21-5733-4f6c-8e6c-5bf052b37cf5", order_id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", product_id: "p015", product_name: "Cagrilintide 10mg", quantity: "1.00", unit_price: "170.00", line_total: "170.00", created_at: "2026-03-21T17:27:18.086Z" },
      { id: "0e18ee67-e3cb-4477-83b5-0f624df33099", order_id: "9ece120d-7dbc-4009-ae0c-658d3d58b3d5", product_id: "p096", product_name: "HCG 1000 IU GMP 3ml 10vials", quantity: "1.00", unit_price: "40.00", line_total: "40.00", created_at: "2026-03-21T06:31:03.403Z" },
      { id: "0e42232a-63b4-4b7e-b616-b655d045abce", order_id: "feacea3c-d137-4fb2-8955-2f154947b317", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "1.00", unit_price: "135.00", line_total: "135.00", created_at: "2026-03-20T13:23:13.883Z" },
      { id: "0e5a319b-4b8a-4604-bac8-133667736ead", order_id: "e8b38f59-85d4-4c03-9581-eca90f3bf35f", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "1.00", unit_price: "135.00", line_total: "135.00", created_at: "2026-03-18T20:20:09.000Z" },
      { id: "0eeb1a71-3f32-483a-9543-f91da2299cdd", order_id: "c310cffd-47c0-4225-ade9-62923897b77f", product_id: "p084", product_name: "KPV 10mg", quantity: "1.00", unit_price: "60.00", line_total: "60.00", created_at: "2026-03-18T20:20:08.899Z" },
      { id: "0f3ae874-25a0-4b30-ae39-99f71483607d", order_id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", product_id: "p024", product_name: "HGH 10IU", quantity: "1.00", unit_price: "50.00", line_total: "50.00", created_at: "2026-03-18T20:20:09.007Z" },
      { id: "1077a9d5-e3f6-4681-b8dd-09463bfb0f61", order_id: "05edc6e3-04b1-4487-bdda-898348202bfb", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "2.00", unit_price: "135.00", line_total: "270.00", created_at: "2026-04-01T01:09:58.284Z" },
      { id: "11161c95-1fec-4488-8165-27b0d5b01fc2", order_id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", product_id: "p008", product_name: "Tirzepatide 100mg", quantity: "1.00", unit_price: "220.00", line_total: "220.00", created_at: "2026-03-18T20:20:08.917Z" },
      { id: "11b5b89c-e9db-478c-a454-48371a56da02", order_id: "d25da38b-20aa-40ff-ba34-e1638b380836", product_id: "p024", product_name: "HGH 10IU", quantity: "3.00", unit_price: "50.00", line_total: "150.00", created_at: "2026-03-18T20:20:08.989Z" },
      { id: "11f966db-f067-4ec7-a884-80f932ec47ef", order_id: "c67237d3-15ca-4487-b138-43c30d2e1df0", product_id: "p062", product_name: "Selank 10mg", quantity: "1.00", unit_price: "55.00", line_total: "55.00", created_at: "2026-03-18T20:20:08.877Z" },
      { id: "1243eff3-e800-428b-a791-5db98f1f82d7", order_id: "ef424a02-1925-4f55-949b-4b714f5c7cbc", product_id: "p032", product_name: "TB500 (TB4) 10mg", quantity: "1.00", unit_price: "85.00", line_total: "85.00", created_at: "2026-03-28T19:56:43.782Z" },
      { id: "12c545fe-b5be-4a5e-98cb-559d191970e4", order_id: "bb1c75a0-a705-4887-9f13-38ed114c6af3", product_id: "p004", product_name: "Tirzepatide 20mg", quantity: "1.00", unit_price: "85.00", line_total: "85.00", created_at: "2026-03-18T23:17:30.972Z" },
      { id: "12f728f6-c12c-40b0-bffe-0a66ac3b2ced", order_id: "03a194ac-176f-45d5-9f81-6a28e7f17c0c", product_id: "p078", product_name: "GHK-CU 100mg", quantity: "1.00", unit_price: "51.00", line_total: "51.00", created_at: "2026-03-18T20:20:09.035Z" },
      { id: "1340ee53-18e2-4c22-9787-bf22f481f497", order_id: "f7ad2e8d-85c8-40f5-b209-089b571acdad", product_id: "p063", product_name: "Na Semax", quantity: "1.00", unit_price: "70.00", line_total: "70.00", created_at: "2026-03-30T19:37:22.989Z" },
      { id: "14e5799f-418f-4553-9571-e63e081e160e", order_id: "b0ca116d-aaea-4b84-9ae0-8cac8ad64280", product_id: "p069", product_name: "DSIP 5mg", quantity: "1.00", unit_price: "35.00", line_total: "35.00", created_at: "2026-03-18T20:20:09.097Z" },
      { id: "155afa06-600d-4f5a-8943-8d87126e7a0c", order_id: "3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4", product_id: "p030", product_name: "BPC 157 10mg", quantity: "1.00", unit_price: "45.00", line_total: "45.00", created_at: "2026-03-18T20:20:08.891Z" },
      { id: "155fa6e3-a08d-4234-9029-dd53207a02fe", order_id: "872ee5ff-b754-4068-ad98-c7c06c86e42d", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "1.00", unit_price: "135.00", line_total: "135.00", created_at: "2026-03-18T20:20:09.067Z" },
      { id: "157e56da-017e-44d2-b632-59f89ec5c0f4", order_id: "f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93", product_id: "p010", product_name: "Retatrutide 20mg", quantity: "1.00", unit_price: "120.00", line_total: "120.00", created_at: "2026-03-27T13:20:48.326Z" },
      { id: "16a99768-289b-436e-a55c-6dc2e4f069bf", order_id: "56b0fc96-fb0a-4894-90e6-b0155adc13b2", product_id: "p009", product_name: "Retatrutide 10mg", quantity: "1.00", unit_price: "95.00", line_total: "95.00", created_at: "2026-03-25T14:56:25.607Z" },
      { id: "16d4b084-e8f3-455f-922e-fa6b0504c5c8", order_id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", product_id: "p118", product_name: "Vesilute 20mg", quantity: "1.00", unit_price: "120.00", line_total: "120.00", created_at: "2026-03-18T20:20:09.071Z" },
      { id: "170dfb42-e15f-459f-af09-61e9ad2b855a", order_id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "0.50", unit_price: "135.00", line_total: "67.50", created_at: "2026-03-18T20:20:09.007Z" },
      { id: "172b21c7-8208-4313-9fc5-44831ec771cd", order_id: "17b2c399-9bba-4740-8b1e-751b5baaa252", product_id: "p049", product_name: "Tesamorelin 10mg", quantity: "0.50", unit_price: "125.00", line_total: "62.50", created_at: "2026-03-18T20:20:08.942Z" },
      { id: "18551a57-1fc8-4c3d-a57f-25bf5aaa8672", order_id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", product_id: "p012", product_name: "Retatrutide 40mg", quantity: "1.00", unit_price: "165.00", line_total: "165.00", created_at: "2026-03-18T20:20:08.917Z" },
      { id: "1875193c-46d9-4093-97c1-f2880b8f71da", order_id: "17b2c399-9bba-4740-8b1e-751b5baaa252", product_id: "p010", product_name: "Retatrutide 20mg", quantity: "3.00", unit_price: "120.00", line_total: "360.00", created_at: "2026-03-21T13:13:46.402Z" },
      { id: "197e8f88-ae88-4c3d-a403-8d8216c99d19", order_id: "f390e78f-35ca-4021-a236-a0c36532a061", product_id: "p072", product_name: "BPC 10mg / TB4 10mg Blend", quantity: "1.00", unit_price: "135.00", line_total: "135.00", created_at: "2026-03-20T06:50:33.892Z" },
      { id: "19bca8c4-ec44-4c33-85fb-8a927e34afa2", order_id: "ef424a02-1925-4f55-949b-4b714f5c7cbc", product_id: "p030", product_name: "BPC 157 10mg", quantity: "1.00", unit_price: "45.00", line_total: "45.00", created_at: "2026-03-28T19:56:43.782Z" },
      { id: "1a00f57b-cf08-4efe-b81e-d7dd28f1ef06", order_id: "e8b38f59-85d4-4c03-9581-eca90f3bf35f", product_id: "p024", product_name: "HGH 10IU", quantity: "1.00", unit_price: "50.00", line_total: "50.00", created_at: "2026-03-18T20:20:09.000Z" },
      { id: "1a7ba6b4-ebdb-4f05-a109-17ebc4d54eaf", order_id: "03a194ac-176f-45d5-9f81-6a28e7f17c0c", product_id: "p030", product_name: "BPC 157 10mg", quantity: "2.00", unit_price: "45.00", line_total: "90.00", created_at: "2026-03-30T15:48:06.049Z" },
      { id: "1ab45e06-8aaf-4894-b462-7d5135115930", order_id: "17b2c399-9bba-4740-8b1e-751b5baaa252", product_id: "p110", product_name: "Cortagen 20mg", quantity: "0.50", unit_price: "120.00", line_total: "60.00", created_at: "2026-03-21T13:13:46.402Z" },
      { id: "1b56f642-2f02-4a54-aec5-3eab3a2fddf0", order_id: "73984bec-7961-4a99-9f63-fe38ebe2acc5", product_id: "p078", product_name: "GHK-CU 100mg", quantity: "2.00", unit_price: "51.00", line_total: "102.00", created_at: "2026-03-21T10:50:54.147Z" },
      { id: "1b81b6f9-5d56-495f-a359-c2fcdee5ce87", order_id: "ef424a02-1925-4f55-949b-4b714f5c7cbc", product_id: "p089", product_name: "KLOW (TB 10mg + BPC 10mg + KPV 10mg + GHK 50mg)", quantity: "1.00", unit_price: "160.00", line_total: "160.00", created_at: "2026-03-28T19:56:43.782Z" },
      { id: "1e21c9e7-5063-4800-a9e7-8b33739a7fae", order_id: "68c55da7-3de1-4de5-9819-c6ec3c35849e", product_id: "p012", product_name: "Retatrutide 40mg", quantity: "1.00", unit_price: "165.00", line_total: "165.00", created_at: "2026-03-20T08:56:02.662Z" },
      { id: "21e5d08c-79ca-4a1a-a54f-86c9251e1238", order_id: "56b0fc96-fb0a-4894-90e6-b0155adc13b2", product_id: "p058", product_name: "Thymosin Alpha-1 10mg", quantity: "0.50", unit_price: "125.00", line_total: "62.50", created_at: "2026-03-25T14:56:25.607Z" },
      { id: "26e7c5e6-1026-4a87-abbe-4e81174d947e", order_id: "cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca", product_id: "p042", product_name: "Melanotan II 10mg", quantity: "0.50", unit_price: "40.00", line_total: "20.00", created_at: "2026-03-18T20:20:09.029Z" },
      { id: "2738030e-e06d-487c-8fea-9c0960d18f3f", order_id: "d25da38b-20aa-40ff-ba34-e1638b380836", product_id: "p003", product_name: "Tirzepatide 15mg", quantity: "1.00", unit_price: "80.00", line_total: "80.00", created_at: "2026-03-18T20:20:08.989Z" },
      { id: "283d5ac3-1d3e-4857-b66d-2780671bf3cb", order_id: "0581d320-40f1-40e7-9adb-cd05ffaabda1", product_id: "p108", product_name: "Vilon 20mg", quantity: "1.00", unit_price: "120.00", line_total: "120.00", created_at: "2026-03-18T20:20:09.024Z" },
      { id: "288f4d54-b9d0-4839-b2ba-f94dc4a57169", order_id: "05edc6e3-04b1-4487-bdda-898348202bfb", product_id: "p017", product_name: "Survodutide 10mg", quantity: "1.00", unit_price: "170.00", line_total: "170.00", created_at: "2026-03-18T20:20:09.076Z" },
      { id: "28a99453-8ca2-431a-8b89-74dcd6fe5c01", order_id: "3bd9eefd-7e2a-4e5c-9b4e-b1cff3038cf4", product_id: "p089", product_name: "KLOW (TB10+BPC10+KPV10+GHK50)", quantity: "1.00", unit_price: "160.00", line_total: "160.00", created_at: "2026-03-18T20:20:08.891Z" },
      { id: "28e573b4-9452-4a8f-bbcf-8e0b38248d7a", order_id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", product_id: "p051", product_name: "Mots-C 10mg", quantity: "1.00", unit_price: "55.00", line_total: "55.00", created_at: "2026-04-01T14:14:29.360Z" },
      { id: "297118df-50ef-48ab-b6a1-6b53879541d7", order_id: "fb87ced5-8e31-4eaf-a3cd-64cba23b3188", product_id: "p007", product_name: "Tirzepatide 60mg", quantity: "2.00", unit_price: "135.00", line_total: "270.00", created_at: "2026-03-18T20:20:08.924Z" },
      { id: "298d5e58-c3f4-4cfe-a64e-5185ec89a41c", order_id: "a4cab9d2-7cb6-4f24-baa6-208f41bad4ca", product_id: "p080", product_name: "NAD+ 500mg", quantity: "1.00", unit_price: "95.00", line_total: "95.00", created_at: "2026-03-18T20:20:08.905Z" },
      { id: "2aa851bf-d359-4f3c-957b-5d49b087d863", order_id: "cf6314ad-7e40-4b9a-bf6f-0d95d4db46ca", product_id: "p002", product_name: "Tirzepatide 10mg", quantity: "1.00", unit_price: "65.00", line_total: "65.00", created_at: "2026-03-18T20:20:09.029Z" },
      { id: "2d3034cc-8ef2-4d18-aaab-a2f8d154b9c3", order_id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", product_id: "p025", product_name: "IGF-1 LR3 1mg", quantity: "1.00", unit_price: "210.00", line_total: "210.00", created_at: "2026-03-18T20:20:08.973Z" },
      { id: "2da837ef-1098-445e-b99a-509cc10b7fd7", order_id: "c310cffd-47c0-4225-ade9-62923897b77f", product_id: "p024", product_name: "HGH 10IU", quantity: "2.00", unit_price: "50.00", line_total: "100.00", created_at: "2026-03-18T20:20:08.899Z" },
      { id: "2dfc780b-5f3d-43ae-bf22-25177ef81468", order_id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", product_id: "p039", product_name: "Epitalon 10mg", quantity: "1.00", unit_price: "45.00", line_total: "45.00", created_at: "2026-03-18T20:20:09.071Z" },
      { id: "2f9bbe79-35cf-4db9-bf1d-9180d3ed14af", order_id: "f7a805fd-f97e-4689-a011-2737dadc372f", product_id: "p080", product_name: "NAD+ 500mg", quantity: "1.00", unit_price: "95.00", line_total: "95.00", created_at: "2026-03-18T20:20:08.959Z" },
      { id: "3103a524-0565-4d6d-a8f8-1b8ed98dbf67", order_id: "c427c53f-7a6f-4f99-87c4-e9e6224a68f7", product_id: "p006", product_name: "Tirzepatide 45mg", quantity: "1.00", unit_price: "115.00", line_total: "115.00", created_at: "2026-03-22T21:07:38.412Z" },
      { id: "31640e8f-8fc8-4392-a6db-4ca851a4e01c", order_id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", product_id: "p039", product_name: "Epitalon 10mg", quantity: "1.00", unit_price: "45.00", line_total: "45.00", created_at: "2026-04-02T16:46:03.959Z" },
      { id: "317d1ee8-fd9d-4ab0-91aa-3dcc22191528", order_id: "c0a3135e-928e-4285-8916-e1f7ed71e04b", product_id: "p012", product_name: "Retatrutide 40mg", quantity: "1.00", unit_price: "165.00", line_total: "165.00", created_at: "2026-03-21T17:27:18.086Z" },
      { id: "31cd4fa0-97c7-4f64-a7ef-93f85187955e", order_id: "8fee86d5-5f56-462a-bc6f-354c2bcdc90e", product_id: "p072", product_name: "BPC 10mg / TB4 10mg Blend", quantity: "3.00", unit_price: "135.00", line_total: "405.00", created_at: "2026-03-18T20:20:08.973Z" },
      { id: "31e60a3c-7815-44c3-a951-987724b676e8", order_id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", product_id: "p013", product_name: "Retatrutide 50mg", quantity: "1.00", unit_price: "205.00", line_total: "205.00", created_at: "2026-03-18T20:20:09.007Z" },
      { id: "32a83f5d-c655-4f5a-9cd4-1f79dfcc79ae", order_id: "c67237d3-15ca-4487-b138-43c30d2e1df0", product_id: "p012", product_name: "Retatrutide 40mg", quantity: "2.00", unit_price: "165.00", line_total: "330.00", created_at: "2026-03-18T20:20:08.877Z" },
      { id: "32cb0d0d-0a28-4620-8e6f-2b1da57a76f5", order_id: "03a194ac-176f-45d5-9f81-6a28e7f17c0c", product_id: "p032", product_name: "TB500 (TB4) 10mg", quantity: "1.00", unit_price: "85.00", line_total: "85.00", created_at: "2026-03-30T15:48:06.049Z" },
      { id: "335b7fd1-5ce6-47b6-9019-753c12aeb9fc", order_id: "fb87ced5-8e31-4eaf-a3cd-64cba23b3188", product_id: "p078", product_name: "GHK-CU 100mg", quantity: "3.00", unit_price: "51.00", line_total: "153.00", created_at: "2026-03-18T20:20:08.924Z" },
      { id: "3398f41e-ba84-4bc8-bd5b-422feea7835e", order_id: "af9e5b89-b039-4746-93be-5e2c9cf2dddd", product_id: "p091", product_name: "Ara-290 16mg", quantity: "2.00", unit_price: "60.00", line_total: "120.00", created_at: "2026-03-18T20:20:09.007Z" },
      { id: "34ac0e59-307b-499c-b6e1-b5928acf7875", order_id: "83a3d960-ba23-47a3-883c-ed6883ab9d27", product_id: "p042", product_name: "Melanotan II 10mg", quantity: "1.00", unit_price: "40.00", line_total: "40.00", created_at: "2026-04-02T16:46:03.959Z" },
      { id: "35342a0e-6866-4fe2-bc2b-7c6e0d5973f0", order_id: "ed8e0967-57d6-421d-906e-8ca68e8cc3ba", product_id: "p089", product_name: "KLOW (TB10+BPC10+KPV10+GHK50)", quantity: "1.00", unit_price: "160.00", line_total: "160.00", created_at: "2026-03-18T20:20:09.062Z" },
    ];
    for (const row of orderLineItems) {
      await client.query(
        `INSERT INTO order_line_items (id, order_id, product_id, product_name, quantity, unit_price, line_total, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.order_id, row.product_id, row.product_name, row.quantity, row.unit_price, row.line_total, row.created_at]
      );
    }
    console.log(`  -> ${orderLineItems.length} rows`);

    // 6. Admin alerts
    console.log("Importing admin_alerts...");
    const adminAlerts = [
      { id: 1, type: "order", priority: "high", title: "New Order", message: "New order #7884 placed by @carpediem831 — $72.50", is_read: true, link_url: "#orders:ef424a02-1925-4f55-949b-4b714f5c7cbc", related_entity_id: "ef424a02-1925-4f55-949b-4b714f5c7cbc", created_at: "2026-03-24T10:34:43.385Z" },
      { id: 2, type: "order", priority: "medium", title: "Order Cancelled", message: "Order #6130 was cancelled", is_read: true, link_url: "#orders", related_entity_id: "074ac35a-81ad-4d06-8e43-c2cbd76a1ea5", created_at: "2026-03-24T12:11:20.841Z" },
      { id: 3, type: "order", priority: "high", title: "New Order", message: "New order #6056 placed by @ironmanjamie — $1087.50", is_read: true, link_url: "#orders:56b0fc96-fb0a-4894-90e6-b0155adc13b2", related_entity_id: "56b0fc96-fb0a-4894-90e6-b0155adc13b2", created_at: "2026-03-25T14:56:25.976Z" },
      { id: 4, type: "order", priority: "medium", title: "Order Cancelled", message: "Order #3169 was cancelled", is_read: true, link_url: "#orders", related_entity_id: "2cf4b83d-9f35-4bc8-a167-d79e5ab7a8de", created_at: "2026-03-26T13:55:07.935Z" },
      { id: 5, type: "order", priority: "high", title: "New Order", message: "New order #8583 placed by @mkp_uk — $123.00", is_read: true, link_url: "#orders:f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93", related_entity_id: "f2f6ec99-5b7c-4ae0-82a4-219f5eabfe93", created_at: "2026-03-27T13:20:48.831Z" },
      { id: 6, type: "order", priority: "high", title: "New Order", message: "New order #9360 placed by @ploddingalong — $971.00", is_read: false, link_url: "#orders:d6cb9628-82e3-42e1-a9b0-7dc044c79837", related_entity_id: "d6cb9628-82e3-42e1-a9b0-7dc044c79837", created_at: "2026-03-27T13:37:54.381Z" },
      { id: 7, type: "order", priority: "medium", title: "Order Cancelled", message: "Order #0021 was cancelled", is_read: true, link_url: "#orders", related_entity_id: "e8b38f59-85d4-4c03-9581-eca90f3bf35f", created_at: "2026-03-28T10:47:38.568Z" },
      { id: 8, type: "order", priority: "high", title: "New Order", message: "New order #5168 placed by @grundlefly1 — $303.00", is_read: false, link_url: "#orders:4e4a3e91-871e-4486-8b8e-828a75cd40f1", related_entity_id: "4e4a3e91-871e-4486-8b8e-828a75cd40f1", created_at: "2026-03-29T10:36:07.104Z" },
      { id: 9, type: "order", priority: "medium", title: "Order Cancelled", message: "Order #9360 was cancelled", is_read: true, link_url: "#orders", related_entity_id: "d6cb9628-82e3-42e1-a9b0-7dc044c79837", created_at: "2026-03-31T18:33:40.935Z" },
    ];
    for (const row of adminAlerts) {
      await client.query(
        `INSERT INTO admin_alerts (id, type, priority, title, message, is_read, link_url, related_entity_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.type, row.priority, row.title, row.message, row.is_read, row.link_url, row.related_entity_id, row.created_at]
      );
    }
    // Reset sequence
    await client.query(`SELECT setval('admin_alerts_id_seq', (SELECT MAX(id) FROM admin_alerts))`);
    console.log(`  -> ${adminAlerts.length} rows`);

    // 7. Audit logs (first 64 of 717 - partial due to message truncation)
    console.log("Importing audit_logs (partial - 64 of 717)...");
    const auditLogData = [
      [1,"login","warn","admin_login_failed","Failed admin login attempt",'{"ip":"34.24.36.69"}','34.24.36.69',"2026-03-20T09:38:19.343Z"],
      [2,"login","warn","admin_login_failed","Failed admin login attempt",'{"ip":"34.28.115.107"}','34.28.115.107',"2026-03-20T09:38:30.525Z"],
      [3,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"35.193.3.192"}','35.193.3.192',"2026-03-20T09:38:32.734Z"],
      [4,"order","info","order_updated_by_admin",'Admin updated order 0043 (Clarke): pin','{"code":"0043","changes":{"pin":"1234"},"orderId":"ece1625b-f1c1-48fc-827c-9a5978560ac7","telegramUsername":"Clarke"}','35.227.80.228',"2026-03-20T09:38:50.566Z"],
      [5,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"136.111.227.54"}','136.111.227.54',"2026-03-20T09:40:50.927Z"],
      [6,"login","warn","lookup_failed","Failed order lookup for identifier: clarke",'{"blocked":false,"identifier":"clarke","failedAttempts":4}','35.190.148.147',"2026-03-20T10:16:03.880Z"],
      [7,"login","warn","lookup_failed","Failed order lookup for identifier: @mkp-ik",'{"blocked":false,"identifier":"@mkp-ik","failedAttempts":1}','35.190.148.147',"2026-03-20T10:46:07.550Z"],
      [8,"login","warn","lookup_failed","Failed order lookup for identifier: @mkp-uk",'{"blocked":false,"identifier":"@mkp-uk","failedAttempts":1}','35.190.145.24',"2026-03-20T10:46:13.195Z"],
      [9,"login","warn","lookup_failed","Failed order lookup for identifier: @mkp_uk",'{"blocked":false,"identifier":"@mkp_uk","failedAttempts":1}','35.190.148.147',"2026-03-20T10:46:24.049Z"],
      [10,"login","warn","lookup_failed","Failed order lookup for identifier: @mkp_uk",'{"blocked":false,"identifier":"@mkp_uk","failedAttempts":2}','35.243.247.101',"2026-03-20T10:47:46.610Z"],
      [11,"login","warn","lookup_failed","Failed order lookup for identifier: @mkp",'{"blocked":false,"identifier":"@mkp","failedAttempts":1}','35.243.247.101',"2026-03-20T10:50:41.348Z"],
      [12,"order","info","order_created","New order 5485 created by @mkp_uk (InPost, total: 168.00)",'{"code":"5485","orderId":"6c5bc992-e88b-4a57-b293-4d94ba7e6ced","grandTotal":"168.00","deliveryMethod":"InPost","telegramUsername":"@mkp_uk"}','35.196.201.235',"2026-03-20T10:53:57.654Z"],
      [13,"login","warn","lookup_failed","Failed order lookup for identifier: johncenacme",'{"blocked":false,"identifier":"johncenacme","failedAttempts":1}','34.10.2.232',"2026-03-20T10:54:03.753Z"],
      [14,"login","warn","lookup_failed","Failed order lookup for identifier: @johncenacme",'{"blocked":false,"identifier":"@johncenacme","failedAttempts":2}','34.10.2.232',"2026-03-20T10:54:11.055Z"],
      [15,"login","info","lookup_success","Successful order lookup for @mkp_uk (order 5485)",'{"orderId":"6c5bc992-e88b-4a57-b293-4d94ba7e6ced","orderCode":"5485","identifier":"@mkp_uk","telegramUsername":"@mkp_uk"}','35.227.80.228',"2026-03-20T10:54:27.420Z"],
      [16,"order","warn","order_deleted_by_customer","Customer deleted order 5485 (@mkp_uk, status: Submitted)",'{"code":"5485","status":"Submitted","orderId":"6c5bc992-e88b-4a57-b293-4d94ba7e6ced","telegramUsername":"@mkp_uk"}','34.23.146.22',"2026-03-20T10:54:42.135Z"],
      [17,"login","warn","lookup_failed","Failed order lookup for identifier: @johncenacme",'{"blocked":false,"identifier":"@johncenacme","failedAttempts":3}','34.23.116.255',"2026-03-20T10:56:13.536Z"],
      [18,"login","warn","lookup_failed","Failed order lookup for identifier: @johncenacme",'{"blocked":false,"identifier":"@johncenacme","failedAttempts":4}','34.148.7.61',"2026-03-20T10:56:18.668Z"],
      [19,"login","warn","lookup_failed","Failed order lookup for identifier: johncenacme",'{"blocked":false,"identifier":"johncenacme","failedAttempts":2}','35.231.191.228',"2026-03-20T10:56:23.962Z"],
      [20,"login","warn","lookup_failed","Failed order lookup for identifier: johncenacme",'{"blocked":false,"identifier":"johncenacme","failedAttempts":3}','35.243.247.101',"2026-03-20T11:02:16.970Z"],
      [21,"login","warn","lookup_failed","Failed order lookup for identifier: @miki19844",'{"blocked":false,"identifier":"@miki19844","failedAttempts":1}','35.243.247.101',"2026-03-20T11:08:12.367Z"],
      [22,"login","warn","lookup_failed","Failed order lookup for identifier: miki19844",'{"blocked":false,"identifier":"miki19844","failedAttempts":1}','35.190.145.24',"2026-03-20T11:08:44.422Z"],
      [23,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.24.36.69"}','34.24.36.69',"2026-03-20T11:09:24.872Z"],
      [24,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.146.22"}','34.23.146.22',"2026-03-20T11:09:40.268Z"],
      [25,"change","info","lockout_cleared","Admin cleared lockout for identifier: miki19844",'{"identifier":"miki19844","failedAttempts":1}','34.148.7.61',"2026-03-20T11:10:02.655Z"],
      [26,"change","info","lockout_cleared","Admin cleared lockout for identifier: @miki19844",'{"identifier":"@miki19844","failedAttempts":1}','35.227.80.228',"2026-03-20T11:10:03.316Z"],
      [27,"change","info","lockout_cleared","Admin cleared lockout for identifier: johncenacme",'{"identifier":"johncenacme","failedAttempts":3}','35.231.191.228',"2026-03-20T11:10:03.791Z"],
      [28,"change","info","lockout_cleared","Admin cleared lockout for identifier: @johncenacme",'{"identifier":"@johncenacme","failedAttempts":4}','34.24.36.69',"2026-03-20T11:10:04.303Z"],
      [29,"change","info","lockout_cleared","Admin cleared lockout for identifier: @mkp",'{"identifier":"@mkp","failedAttempts":1}','34.148.7.61',"2026-03-20T11:10:04.784Z"],
      [30,"change","info","lockout_cleared","Admin cleared lockout for identifier: @mkp-uk",'{"identifier":"@mkp-uk","failedAttempts":1}','34.148.7.61',"2026-03-20T11:10:05.225Z"],
      [31,"change","info","lockout_cleared","Admin cleared lockout for identifier: @mkp-ik",'{"identifier":"@mkp-ik","failedAttempts":1}','35.231.191.228',"2026-03-20T11:10:05.674Z"],
      [32,"change","info","lockout_cleared","Admin cleared lockout for identifier: clarke",'{"identifier":"clarke","failedAttempts":4}','35.231.191.228',"2026-03-20T11:10:06.509Z"],
      [33,"change","info","lockout_cleared","Admin cleared lockout for identifier: @lizzie2391",'{"identifier":"@lizzie2391","failedAttempts":4}','34.148.7.61',"2026-03-20T11:10:06.932Z"],
      [34,"change","info","lockout_cleared","Admin cleared lockout for identifier: lizzie2391",'{"identifier":"lizzie2391","failedAttempts":3}','34.148.7.61',"2026-03-20T11:10:07.350Z"],
      [35,"change","warn","all_lockouts_cleared","Admin cleared all login lockouts",'{}',"34.23.146.22","2026-03-20T11:10:08.754Z"],
      [36,"login","info","lookup_success","Successful order lookup for @ADev81 (order 0024)",'{"orderId":"7522e0b8-cf16-40ef-aff9-9b3180098433","orderCode":"0024","identifier":"adev81","telegramUsername":"@ADev81"}','34.24.36.69',"2026-03-20T11:10:44.814Z"],
      [37,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.116.255"}','34.23.116.255',"2026-03-20T11:10:54.287Z"],
      [38,"login","info","pin_changed","PIN changed for @adev81 (order 0024)",'{"orderId":"7522e0b8-cf16-40ef-aff9-9b3180098433","orderCode":"0024","telegramUsername":"@adev81"}','34.23.146.22',"2026-03-20T11:10:57.835Z"],
      [39,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"35.243.247.101"}','35.243.247.101',"2026-03-20T11:11:26.750Z"],
      [40,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.135.198.110"}','34.135.198.110',"2026-03-20T11:12:02.628Z"],
      [41,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.42.159.107"}','34.42.159.107',"2026-03-20T11:12:03.393Z"],
      [42,"login","info","lookup_success","Successful order lookup for @jakeh1992 (order 0009)",'{"orderId":"3a5df063-138c-4498-bef2-6d733ca93ea2","orderCode":"0009","identifier":"@jakeh1992","telegramUsername":"@jakeh1992"}','34.28.115.107',"2026-03-20T11:12:16.782Z"],
      [43,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.135.198.110"}','34.135.198.110',"2026-03-20T11:12:16.897Z"],
      [44,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.10.2.232"}','34.10.2.232',"2026-03-20T11:12:17.681Z"],
      [45,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.10.2.232"}','34.10.2.232',"2026-03-20T11:12:22.247Z"],
      [46,"login","info","pin_changed","PIN changed for @jakeh1992 (order 0009)",'{"orderId":"3a5df063-138c-4498-bef2-6d733ca93ea2","orderCode":"0009","telegramUsername":"@jakeh1992"}','35.193.3.192',"2026-03-20T11:12:28.144Z"],
      [47,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.42.159.107"}','34.42.159.107',"2026-03-20T11:12:29.024Z"],
      [48,"order","info","order_updated_by_admin","Admin updated order 6130 (@JohnCenaCMe): pin",'{"code":"6130","changes":{"pin":"0000"},"orderId":"074ac35a-81ad-4d06-8e43-c2cbd76a1ea5","telegramUsername":"@JohnCenaCMe"}','34.148.7.61',"2026-03-20T11:12:57.537Z"],
      [49,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"35.196.201.235"}','35.196.201.235',"2026-03-20T11:13:02.012Z"],
      [50,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.146.22"}','34.23.146.22',"2026-03-20T11:13:17.957Z"],
      [51,"order","info","order_updated_by_admin","Admin updated order 0019 (Pink ladybug): pin",'{"code":"0019","changes":{"pin":"1234"},"orderId":"d25da38b-20aa-40ff-ba34-e1638b380836","telegramUsername":"Pink ladybug"}','35.231.191.228',"2026-03-20T11:13:31.525Z"],
      [52,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.135.198.110"}','34.135.198.110',"2026-03-20T11:13:33.438Z"],
      [53,"login","info","lookup_success","Successful order lookup for @ADev81 (order 0024)",'{"orderId":"7522e0b8-cf16-40ef-aff9-9b3180098433","orderCode":"0024","identifier":"adev81","telegramUsername":"@ADev81"}','35.231.191.228',"2026-03-20T11:14:02.554Z"],
      [54,"login","info","lookup_success","Successful order lookup for @JohnCenaCMe (order 6130)",'{"orderId":"074ac35a-81ad-4d06-8e43-c2cbd76a1ea5","orderCode":"6130","identifier":"@johncenacme","telegramUsername":"@JohnCenaCMe"}','34.23.146.22',"2026-03-20T11:14:18.123Z"],
      [55,"login","info","pin_changed","PIN changed for @johncenacme (order 6130)",'{"orderId":"074ac35a-81ad-4d06-8e43-c2cbd76a1ea5","orderCode":"6130","telegramUsername":"@johncenacme"}','34.23.146.22',"2026-03-20T11:14:39.416Z"],
      [56,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"35.227.80.228"}','35.227.80.228',"2026-03-20T11:15:00.091Z"],
      [57,"login","info","lookup_success","Successful order lookup for @jakeh1992 (order 0009)",'{"orderId":"3a5df063-138c-4498-bef2-6d733ca93ea2","orderCode":"0009","identifier":"@jakeh1992","telegramUsername":"@jakeh1992"}','35.196.201.235',"2026-03-20T11:15:41.238Z"],
      [58,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.116.255"}','34.23.116.255',"2026-03-20T11:16:19.244Z"],
      [59,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"35.231.191.228"}','35.231.191.228',"2026-03-20T11:16:19.994Z"],
      [60,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.116.255"}','34.23.116.255',"2026-03-20T11:17:21.546Z"],
      [61,"login","info","admin_login_success","Admin logged in successfully",'{"ip":"34.23.116.255"}','34.23.116.255',"2026-03-20T11:17:22.945Z"],
      [62,"login","warn","lookup_failed","Failed order lookup for identifier: clarke",'{"blocked":false,"identifier":"clarke","failedAttempts":1}','35.193.3.192',"2026-03-20T11:19:16.383Z"],
      [63,"login","warn","lookup_failed","Failed order lookup for identifier: clarke",'{"blocked":false,"identifier":"clarke","failedAttempts":2}','35.193.3.192',"2026-03-20T11:19:21.400Z"],
      [64,"login","warn","lookup_failed","Failed order lookup for identifier: clarke",'{"blocked":false,"identifier":"clarke","failedAttempts":3}','136.111.227.54',"2026-03-20T11:19:24.612Z"],
    ];
    for (const [id, type, level, action, message, metadata, ip, created_at] of auditLogData) {
      await client.query(
        `INSERT INTO audit_logs (id, type, level, action, message, metadata, ip, created_at)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [id, type, level, action, message, metadata, ip, created_at]
      );
    }
    await client.query(`SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs))`);
    console.log(`  -> ${auditLogData.length} rows (partial - 64 of 717)`);

    // 8. Blood test sessions
    console.log("Importing blood_test_sessions...");
    const bloodTestSessions = [
      { id: "1d5b5be7-3881-41c5-a6dd-0ee135f786bd", telegram_username: "iam0121", test_date: "2026-04-05", lab_name: "nhs", test_name: null, measurement_type: null, medication_notes: null, notes: null, created_at: "2026-04-05T21:59:22.428Z" },
      { id: "29d4607b-365b-469f-a149-3ab172834ba7", telegram_username: "iam0121", test_date: "2026-02-04", lab_name: null, test_name: null, measurement_type: null, medication_notes: null, notes: null, created_at: "2026-04-05T22:05:12.011Z" },
      { id: "f857e1f6-f2ec-4f81-ae68-f67757b1d6f7", telegram_username: "iam0121", test_date: "2026-04-06", lab_name: null, test_name: "Randox", measurement_type: "Trough", medication_notes: null, notes: null, created_at: "2026-04-06T20:48:04.432Z" },
    ];
    for (const row of bloodTestSessions) {
      await client.query(
        `INSERT INTO blood_test_sessions (id, telegram_username, test_date, lab_name, test_name, measurement_type, medication_notes, notes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.telegram_username, row.test_date, row.lab_name, row.test_name, row.measurement_type, row.medication_notes, row.notes, row.created_at]
      );
    }
    console.log(`  -> ${bloodTestSessions.length} rows`);

    // 9. Blood test values
    console.log("Importing blood_test_values...");
    const bloodTestValues = [
      ["01e521fe-5ab3-489c-b9c4-3fcff8da1938","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","TSH","Thyroid","2.4100","mIU/L","0.2700","4.2000"],
      ["020b9697-e50e-4a56-8a70-0e1b51a56b07","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Prolactin","Hormones","375.0000","mIU/L","86.0000","324.0000"],
      ["041dca3e-2790-4727-a724-28741725bbf8","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Neutrophils","Full Blood Count","2.5700","×10⁹/L","1.8000","7.5000"],
      ["0d38e911-2861-4ba5-aab1-7e20e20e9518","29d4607b-365b-469f-a149-3ab172834ba7","GGT","Liver","29.0000","U/L",null,"60.0000"],
      ["12323e2c-0701-4fcf-a004-68202ceccdc3","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Urea","Kidney","5.8100","mmol/L","2.5000","7.8000"],
      ["1e60694d-361e-4eba-bacc-458c28a7ebbb","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","HDL","Cholesterol","1.3700","mmol/L","1.0000",null],
      ["26079425-8d18-44ba-b85d-c0dfe5922fe8","29d4607b-365b-469f-a149-3ab172834ba7","Free Testosterone","Hormones","0.4300","pmol/L","170.0000","670.0000"],
      ["26bf17c9-fece-4b02-96fa-c498fd28a7b7","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Prolactin","Hormones","223.0000","mIU/L",null,"360.0000"],
      ["2c417292-a482-441b-bc29-6bb87c1b606f","29d4607b-365b-469f-a149-3ab172834ba7","eGFR","Kidney","74.0000","mL/min/1.73m²","60.0000",null],
      ["2f0c2e23-470b-45f8-b07e-c1f8703cc257","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Free Testosterone","Hormones","0.9530","pmol/L","170.0000","670.0000"],
      ["2fbd4412-78ba-4332-b391-e059738cfd1a","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Free Testosterone","Hormones","0.2000","nmol/L","0.2260","0.6500"],
      ["30996cda-2c26-4e89-8dc7-548947fef88f","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","SHBG","Hormones","61.3000","nmol/L","18.3000","54.1000"],
      ["35e18f3b-7fde-4565-b108-0b25158f4593","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Oestradiol","Hormones","91.8000","pmol/L","41.0000","159.0000"],
      ["3cda602b-6436-448e-a57c-38a178f43cf7","29d4607b-365b-469f-a149-3ab172834ba7","Free T4","Thyroid","21.0000","pmol/L","12.0000","22.0000"],
      ["4197bae4-cc5b-4784-840f-dbd488e48e2a","29d4607b-365b-469f-a149-3ab172834ba7","Urea","Kidney","6.9800","mmol/L","2.5000","7.8000"],
      ["428e9036-f23c-432f-9f9c-7c2d48e61cbd","29d4607b-365b-469f-a149-3ab172834ba7","LDL","Cholesterol","3.4900","mmol/L",null,"3.0000"],
      ["44418468-8dda-4562-a2d0-944c99ee7830","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Lymphocytes","Full Blood Count","1.4800","×10⁹/L","1.0000","4.8000"],
      ["46cd1f08-064d-4ff4-9ce8-ae7a5ecae7fb","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","ALP","Liver","42.0000","U/L","30.0000","130.0000"],
      ["4fe67a3e-3852-4da3-b770-2e39aa8d4c91","29d4607b-365b-469f-a149-3ab172834ba7","Ferritin","Metabolic","175.9100","μg/L","30.0000","400.0000"],
      ["52e806b5-4040-43fb-8048-a77832adb4f2","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","ALT","Liver","34.4000","U/L",null,"41.0000"],
      ["584df235-155b-4256-80a6-e4d726022d4d","29d4607b-365b-469f-a149-3ab172834ba7","HbA1c","Metabolic","25.4600","mmol/mol",null,"48.0000"],
      ["5a493d11-aa94-4117-8fb8-065d072f1054","29d4607b-365b-469f-a149-3ab172834ba7","Haematocrit","Full Blood Count","45.8000","L/L","0.4000","0.5200"],
      ["6088b61a-db7f-49c2-aa28-1ac4171808f0","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Bilirubin","Liver","9.6100","μmol/L",null,"21.0000"],
      ["61cb133e-469f-4374-841b-d0dab0b6ce43","29d4607b-365b-469f-a149-3ab172834ba7","ALT","Liver","19.0000","U/L",null,"41.0000"],
      ["6b01681e-edfc-4d5c-899d-2372fc4f0edb","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Creatinine","Kidney","116.2000","μmol/L","64.0000","104.0000"],
      ["6b7a98e1-dbbb-4f11-933d-f1c5d07a998b","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Follicle Stimulating Hormone","Hormones","4.3400","U/l","1.5000","12.4000"],
      ["6ef2341e-1c04-4fdc-9353-bf2176cb9122","29d4607b-365b-469f-a149-3ab172834ba7","SHBG","Hormones","56.3000","nmol/L","18.3000","54.1000"],
      ["77737299-bc79-4a7c-a750-71bdc8b28be6","29d4607b-365b-469f-a149-3ab172834ba7","WBC","Full Blood Count","3.9000","×10⁹/L","4.0000","11.0000"],
      ["7af6bc23-a344-45d9-a6a0-45f2c06e1daf","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","FSH","Hormones","0.0000","IU/L","1.5000","12.4000"],
      ["812bfb8f-3723-4a62-b564-5d8523481580","29d4607b-365b-469f-a149-3ab172834ba7","Lymphocytes","Full Blood Count","1.5300","×10⁹/L","1.0000","4.8000"],
      ["87706cfa-c3f6-4d53-bf50-fc091d2f7f4d","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Total Cholesterol","Cholesterol","3.3800","mmol/L",null,"5.0000"],
      ["8ad2c484-fd8f-4037-8db2-138ba2299180","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Haemoglobin","Full Blood Count","155.0000","g/L","130.0000","170.0000"],
      ["8f5cfb6d-b7d5-43ec-9cb3-ada3da6ac999","29d4607b-365b-469f-a149-3ab172834ba7","MCV","Full Blood Count","79.4000","fL","80.0000","100.0000"],
      ["92718375-1928-4d5f-88eb-10bac1a27e0a","29d4607b-365b-469f-a149-3ab172834ba7","Oestradiol","Hormones","102.0000","pmol/L",null,"146.0000"],
      ["92f3fefd-bd2f-4422-ae70-525ff53cfb3c","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","WBC","Full Blood Count","4.6800","×10⁹/L","4.0000","11.0000"],
      ["93ff7365-7a9e-4a0e-9dbf-0c4cbd99b9ad","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","eGFR","Kidney","75.0000","mL/min/1.73m²","60.0000",null],
      ["997a5c24-39af-4c21-b03e-b4b877e0891b","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Oestradiol","Hormones","183.0000","pmol/L",null,"146.0000"],
      ["99a35573-53b7-471c-b783-f57e9f65e87d","29d4607b-365b-469f-a149-3ab172834ba7","Bilirubin","Liver","10.0000","μmol/L",null,"21.0000"],
      ["a00ed5e5-bf5c-4194-86e6-512eb4554ee2","29d4607b-365b-469f-a149-3ab172834ba7","RBC","Full Blood Count","5.7700","×10¹²/L","4.5000","5.9000"],
      ["a7829758-620d-40e4-b202-d0d8dd7344cc","29d4607b-365b-469f-a149-3ab172834ba7","HDL","Cholesterol","1.5800","mmol/L","1.0000",null],
      ["a7b4893d-b28d-44e4-b8cc-2de5f12653ca","29d4607b-365b-469f-a149-3ab172834ba7","Neutrophils","Full Blood Count","1.9700","×10⁹/L","1.8000","7.5000"],
      ["ad744ba0-c56d-4c4a-8bfd-1fd431de25fb","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Testosterone","Hormones","15.9000","nmol/L","12.0000","30.0000"],
      ["b1949fd1-2180-45f6-ba1e-79a98f0b5571","29d4607b-365b-469f-a149-3ab172834ba7","Total Testosterone","Hormones","27.6000","nmol/L","8.7000","29.0000"],
      ["b6dbd4de-a38b-4f63-aec4-34c248c84f08","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Free T4","Thyroid","18.0000","pmol/L","12.0000","22.0000"],
      ["bb7cd8a6-da65-4159-bc4e-7ef1a9bb75fa","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","RBC","Full Blood Count","5.9100","×10¹²/L","4.5000","5.9000"],
      ["c47cbc8a-4506-4cfe-960b-06fea20d9276","29d4607b-365b-469f-a149-3ab172834ba7","Haemoglobin","Full Blood Count","153.0000","g/L","130.0000","170.0000"],
      ["ca3888d4-5ea4-4f35-acf3-a03f930e1e10","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","LH","Hormones","0.0000","IU/L","1.7000","8.6000"],
      ["cbb8fda7-1487-414d-91a2-35d29e30b2b4","29d4607b-365b-469f-a149-3ab172834ba7","TSH","Thyroid","3.0300","mIU/L","0.2700","4.2000"],
      ["d2a92484-c2fd-4919-a3f6-6fad3513de0e","29d4607b-365b-469f-a149-3ab172834ba7","ALP","Liver","44.0000","U/L","30.0000","130.0000"],
      ["d9ff0b8a-0a14-48ea-b569-3c99fc8c17c0","29d4607b-365b-469f-a149-3ab172834ba7","Creatinine","Kidney","118.4000","μmol/L","64.0000","104.0000"],
      ["da4b768b-d91d-4e06-b237-3f03375fc715","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","HbA1c","Metabolic","30.8200","mmol/mol",null,"48.0000"],
      ["e213bf9a-9221-4c05-a921-139d13e5ef33","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Total Testosterone","Hormones","54.7000","nmol/L","8.7000","29.0000"],
      ["e315ea99-e6fd-4a71-a125-983472a2bbff","29d4607b-365b-469f-a149-3ab172834ba7","Platelets","Full Blood Count","174.0000","×10⁹/L","150.0000","400.0000"],
      ["e46c4e22-d7bf-4c4d-87e4-65e9e73ebbbb","29d4607b-365b-469f-a149-3ab172834ba7","Albumin","Liver","45.6000","g/L","35.0000","50.0000"],
      ["e612bada-bb0c-4552-b312-8e30b515f0a6","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","GGT","Liver","22.4000","U/L",null,"60.0000"],
      ["e885ee95-5ebc-4874-91a1-b30508772926","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","MCV","Full Blood Count","81.9000","fL","80.0000","100.0000"],
      ["e940babf-cbec-4ac2-aa13-2d43975d0857","29d4607b-365b-469f-a149-3ab172834ba7","Total Cholesterol","Cholesterol","3.2000","mmol/L",null,"5.0000"],
      ["eabed950-b3ac-4e1e-abaa-10a4386d516d","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Luteinising Hormone","Hormones","5.1000","U/l","1.7000","8.6000"],
      ["ef7d127d-79ab-4947-bc16-9d5508f5b967","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Platelets","Full Blood Count","219.0000","×10⁹/L","150.0000","400.0000"],
      ["f1d30ce7-442f-4938-b076-0b81154a4e5b","29d4607b-365b-469f-a149-3ab172834ba7","Prolactin","Hormones","242.0000","mIU/L",null,"360.0000"],
      ["f3a4a0d1-cac9-4bc0-bd7a-7945fc27aa2c","f857e1f6-f2ec-4f81-ae68-f67757b1d6f7","Sex Hormone Binding Globulin","Hormones","64.5000","nmol/L","10.0000","57.0000"],
      ["f9bc7f4c-2885-4071-b402-c3735d22c8d9","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Haematocrit","Full Blood Count","46.0280","L/L","0.4000","0.5200"],
      ["ff18e77e-3931-4e67-9e4d-e6ed7f32ae8e","1d5b5be7-3881-41c5-a6dd-0ee135f786bd","Albumin","Liver","47.9000","g/L","35.0000","50.0000"],
    ];
    for (const [id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high] of bloodTestValues) {
      await client.query(
        `INSERT INTO blood_test_values (id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [id, session_id, biomarker_name, biomarker_category, value, unit, ref_range_low, ref_range_high]
      );
    }
    console.log(`  -> ${bloodTestValues.length} rows`);

    // 10. FS3 costs (132 of 166 provided)
    console.log("Importing fs3_costs (132 of 166 provided)...");
    const fs3Costs = [
      [76,"Semaglutide 10mg","40.00"],[77,"Tirzepatide 10mg","50.00"],[78,"Tirzepatide 15mg","60.00"],[79,"Tirzepatide 20mg","70.00"],[80,"Tirzepatide 30mg","80.00"],[81,"Tirzepatide 45mg","100.00"],[82,"Tirzepatide 60mg","120.00"],[83,"Tirzepatide 100mg","190.00"],[84,"Retatrutide 10mg","80.00"],[85,"Retatrutide 20mg","105.00"],[86,"Retatrutide 30mg","130.00"],[87,"Retatrutide 40mg","150.00"],[88,"Retatrutide 50mg","185.00"],[89,"Retatrutide 100mg","380.00"],[90,"Cagrilintide 5mg","90.00"],[91,"Cagrilintide 10mg","170.00"],[92,"Mazdutide 10mg","160.00"],[93,"Survodutide 10mg","150.00"],[94,"GAC water 10ml","25.00"],[95,"BAC water 10ml","25.00"],[96,"GAC water 3ml","15.00"],[97,"BAC water 3ml","15.00"],[98,"L-Carnitine 500mg×20ml×10vials Water","160.00"],[99,"Cyanocobalamin B12 1mg ×10ml×10vials water","60.00"],[100,"HGH 10IU","50.00"],[101,"IGF-1 LR3 1mg","180.00"],[102,"5-Amino-1MQ 50mg","60.00"],[103,"5-Amino-1MQ 10mg","40.00"],[104,"Adipotide 10mg","165.00"],[105,"VIP 10mg","100.00"],[106,"Bpc 157 10mg","35.00"],[107,"BPC 157 10mg","35.00"],[108,"Bpc 157 40mg","125.00"],[109,"BPC 157 40mg","125.00"],[110,"TB500(TB4) 10mg","85.00"],[111,"TB500 (TB4) 10mg","85.00"],[112,"TB500(TB4) 20mg","150.00"],[113,"TB500 (TB4) 20mg","150.00"],[114,"Abaloparatide 3mg","100.00"],[115,"Teriparatide 750mcg","75.00"],[116,"Fragment 176-191 5mg","75.00"],[117,"Fragment 176–1915mg","75.00"],[118,"PT141 10mg","50.00"],[119,"Pt141 10mg","50.00"],[120,"Kisspeptin-10mg","60.00"],[121,"Kisspeptin 10mg","60.00"],[122,"Epitalon 10mg","40.00"],[123,"Epitalon 50mg","200.00"],[124,"N-Acetyl Epitalon 20mg","80.00"],[125,"Melanotan II 10mg","35.00"],[126,"Melanotan I 10mg","40.00"],[127,"CJC-1295 with Dac 5mg","90.00"],[128,"CJC-1295 with DAC 5mg","90.00"],[129,"CJC-1295 No Dac 10mg","100.00"],[130,"CJC-1295 No DAC 10mg","100.00"],[131,"Tesa / IPA / CJC No DAC 6/3/3mg","100.00"],[132,"GHRP-6 10mg","50.00"],[133,"GHRP-2 10mg","50.00"],[134,"Tesamorelin 10mg","100.00"],[135,"Tesamorelin 20mg","190.00"],[136,"Mots-C 10mg","45.00"],[137,"Mots-C 20mg","90.00"],[138,"Mots-C 40mg","135.00"],[139,"SS-31 10mg","60.00"],[140,"SS-31 30mg","135.00"],[141,"SS-31 50mg","200.00"],[142,"Ipamorelin 10mg","65.00"],[143,"Thymosin Alpha-1 10mg","95.00"],[144,"Thymulin 20mg","100.00"],[145,"Adamax 10mg","240.00"],[146,"Adamax 10mg（1032 da)","240.00"],[147,"Semax 10mg","40.00"],[148,"Selank 10mg","40.00"],[149,"Na semax","60.00"],[150,"Na Semax","60.00"],[151,"Na selank","60.00"],[152,"Na Selank","60.00"],[153,"IllumiNeuro","240.00"],[154,"Fox04 10mg","240.00"],[155,"Oxytocin 10mg","40.00"],[156,"Snap-8 10mg","40.00"],[157,"DSIP 5mg","35.00"],[158,"DSIP 10mg","60.00"],[159,"BPC 5mg/TB4 5mg blend","70.00"],[160,"BPC 10mg/TB4 10mg blend","120.00"],[161,"CJC No Dac/ipa 5/5mg","75.00"],[162,"CJC No DAC / Ipa 5/5mg","75.00"],[163,"CJC 6mg/ipa 11mg blend","145.00"],[164,"CJC 6mg / Ipa 11mg Blend","145.00"],[165,"Tesa 5mg/ipa 5mg blend","110.00"],[166,"Tesa 5mg / Ipa 5mg Blend","110.00"],[167,"Tesa 10mg/ipa 3mg blend","145.00"],[168,"Tesa 10mg / Ipa 3mg Blend","145.00"],[169,"AHK-CU 100mg","60.00"],[170,"GHK-CU 100mg","51.00"],[171,"GHK-CU 50mg","40.00"],[172,"NAD+500mg buffer ph6-6.5","95.00"],[173,"NAD+ 500mg Buffer pH6-6.5","95.00"],[174,"TB500 frag 10mg","60.00"],[175,"TB500 Frag 10mg","60.00"],[176,"Pnc 27 30mg","240.00"],[177,"PNC 27 30mg","240.00"],[178,"Ll 37 5mg","85.00"],[179,"LL-37 5mg","85.00"],[180,"KPV 10mg","45.00"],[181,"Kpv 30mg","110.00"],[182,"KPV 30mg","110.00"],[183,"Sermorelin 5mg","70.00"],[184,"KPV & GHK-CU Blend","5.00"],[185,"GLOW(TB4 10+BP 10+GHK50)","110.00"],[186,"GLOW (TB4 10mg + BPC 10mg + GHK 50mg)","110.00"],[187,"KLOW","150.00"],[188,"KLOW (TB10+BPC10+KPV10+GHK50)","150.00"],[189,"Pe-22-28 10mg","55.00"],[190,"PE-22-28 10mg","55.00"],[191,"Ara-290 16mg","50.00"],[192,"Tri-Heal Max","380.00"],[193,"Slup-332 500mcg","60.00"],[194,"Bam-15 50mg","300.00"],[195,"Bam-15 50mg (usa no resend)","300.00"],[196,"Slu 100mcg/bam25mg blend 60TABS)","95.00"],[197,"SLU 100mcg / BAM 25mg Blend 60 Tabs","95.00"],[198,"HCG 1000 IU GMP","40.00"],[199,"HCG 2000 IU GMP","70.00"],[200,"HCG 5000 IU GMP","175.00"],[201,"HCG 1000 IU GMP 3ml 10vials","40.00"],[202,"HCG 2000 IU GMP 3ml 10vials","70.00"],[203,"HCG 5000 IU GMP 3ml 10vials","175.00"],[204,"Glutathione 600mg GMP 10ML 10vials","45.00"],[205,"Glutathione 1500mg GMP 20ML 10vials","85.00"],[206,"HMG 75IU X 10vials GMP","75.00"],
    ];
    for (const [id, product_name, unit_cost] of fs3Costs) {
      await client.query(
        `INSERT INTO fs3_costs (id, product_name, unit_cost, created_at, updated_at)
         VALUES ($1,$2,$3,NOW(),NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, product_name, unit_cost]
      );
    }
    await client.query(`SELECT setval('fs3_costs_id_seq', (SELECT MAX(id) FROM fs3_costs))`);
    console.log(`  -> ${fs3Costs.length} rows`);

    // 11. Group buy delivery methods
    console.log("Importing group_buy_delivery_methods...");
    await client.query(
      `INSERT INTO group_buy_delivery_methods (id, group_buy_id, delivery_method_id)
       VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      ["a6cd93f4-2eff-4de8-b13f-4f0e51a5cdc1","1794d939-ca34-40f9-b2e0-d6777482f040","dm-royal-mail"]
    );
    console.log(`  -> 1 row`);

    // 12. Group buy products (128 rows)
    console.log("Importing group_buy_products...");
    const groupBuyProducts = [
      ["03dc7c24-42b9-4fef-9049-a0e1c96f410d","1794d939-ca34-40f9-b2e0-d6777482f040","p100",null,true,null],
      ["041d2d2c-4442-4f1e-b316-07bc64331466","1794d939-ca34-40f9-b2e0-d6777482f040","p066",null,true,null],
      ["04c63fc6-86da-4a06-a259-4cd81d8ac0de","1794d939-ca34-40f9-b2e0-d6777482f040","p090",null,true,null],
      ["0581fd63-9488-40a4-8b59-e2b35f5d5f63","1794d939-ca34-40f9-b2e0-d6777482f040","p122",null,true,null],
      ["0bd36e44-7ba7-4c71-b655-b138200f634b","1794d939-ca34-40f9-b2e0-d6777482f040","p048",null,true,null],
      ["0e771e5f-fda0-4f11-bd1d-0d2ea541ed70","1794d939-ca34-40f9-b2e0-d6777482f040","p077",null,true,null],
      ["0f02b146-0fb8-4b96-9ec3-b1866f4b7176","1794d939-ca34-40f9-b2e0-d6777482f040","p076",null,true,null],
      ["123b29cf-e15b-4cd3-a7af-61b939e1f0fb","1794d939-ca34-40f9-b2e0-d6777482f040","p002",null,true,null],
      ["1522facc-1532-40ce-9cac-d41b86a32806","1794d939-ca34-40f9-b2e0-d6777482f040","p004",null,true,null],
      ["1544831b-712b-4333-8781-a3c2de42fb06","1794d939-ca34-40f9-b2e0-d6777482f040","p001",null,true,null],
      ["189eaa27-de3f-44a8-a872-8adc83e0702d","1794d939-ca34-40f9-b2e0-d6777482f040","p010",null,true,null],
      ["1c410030-507e-41fb-a090-abc4bf36e1c1","1794d939-ca34-40f9-b2e0-d6777482f040","p105",null,true,null],
      ["1e28027f-4b1c-472b-a507-09434fbd3843","1794d939-ca34-40f9-b2e0-d6777482f040","prod-65919695",null,true,null],
      ["1e8828ae-713f-4199-98ac-2889fe0fa335","1794d939-ca34-40f9-b2e0-d6777482f040","p123",null,true,null],
      ["2392fb03-b953-426b-b7e4-ce790ede14d1","1794d939-ca34-40f9-b2e0-d6777482f040","p021",null,true,null],
      ["23e6ab80-690c-4871-bb99-8d85015cb0bb","1794d939-ca34-40f9-b2e0-d6777482f040","p111",null,true,null],
      ["242c3db3-4a6e-485a-8981-17e38afc47be","1794d939-ca34-40f9-b2e0-d6777482f040","p065",null,true,null],
      ["248478d1-904e-4bad-a63e-a0a2da22a77e","1794d939-ca34-40f9-b2e0-d6777482f040","p094",null,true,null],
      ["268acd10-bda7-4943-af8f-ca05b60df7ef","1794d939-ca34-40f9-b2e0-d6777482f040","p060",null,true,null],
      ["2714b22a-6364-4700-ae87-76b869337205","1794d939-ca34-40f9-b2e0-d6777482f040","p071",null,true,null],
      ["2adb522e-c22c-4df9-b769-3bd739b7e425","1794d939-ca34-40f9-b2e0-d6777482f040","p024",null,true,null],
      ["2b085bd1-efb3-42c6-b9d5-d7b61cbd6fcf","1794d939-ca34-40f9-b2e0-d6777482f040","p022",null,true,null],
      ["2fcc0976-8cb8-4f2f-b244-7d576451f97b","1794d939-ca34-40f9-b2e0-d6777482f040","p036",null,true,null],
      ["31c71e88-2dc7-4206-9819-0e10f630328a","1794d939-ca34-40f9-b2e0-d6777482f040","p086",null,true,null],
      ["3206a3f4-44f3-47b2-b50e-cd9376a95126","1794d939-ca34-40f9-b2e0-d6777482f040","p124",null,true,null],
      ["32eceac3-34ac-456a-b551-b59ec12446d7","1794d939-ca34-40f9-b2e0-d6777482f040","p019",null,true,null],
      ["34a39f35-3dc5-4eca-96d7-e1cb1da5b1ef","1794d939-ca34-40f9-b2e0-d6777482f040","p126",null,true,null],
      ["34bb8212-0dd9-46f3-b7c9-2a26a2f8b132","1794d939-ca34-40f9-b2e0-d6777482f040","p067",null,true,null],
      ["377bb305-b9d0-4fed-b86e-5f8b632ff37c","1794d939-ca34-40f9-b2e0-d6777482f040","p093",null,true,null],
      ["38c73071-d0dd-4619-9d45-f636ffced74b","1794d939-ca34-40f9-b2e0-d6777482f040","p052",null,true,null],
      ["3a540ab0-bdfc-40db-aaef-f85d8300ad40","1794d939-ca34-40f9-b2e0-d6777482f040","p029",null,true,null],
      ["40637ec3-f783-4c09-915a-472c0f9a47ad","1794d939-ca34-40f9-b2e0-d6777482f040","p117",null,true,null],
      ["41444356-c8ce-4a48-acbd-183ad3454193","1794d939-ca34-40f9-b2e0-d6777482f040","p044",null,true,null],
      ["433ed6fb-99fc-4494-a12c-1191850a6379","1794d939-ca34-40f9-b2e0-d6777482f040","p054",null,true,null],
      ["4635bff7-6a95-461c-a597-0ac798b71222","1794d939-ca34-40f9-b2e0-d6777482f040","p110",null,true,null],
      ["487e89f2-6a41-462b-94f5-9415db1f8317","1794d939-ca34-40f9-b2e0-d6777482f040","p049",null,true,null],
      ["50e27104-cbaf-453b-9f9e-36bcd15c145e","1794d939-ca34-40f9-b2e0-d6777482f040","p040",null,true,null],
      ["54a36cd1-564b-4f6f-920b-7ab62f4eaad4","1794d939-ca34-40f9-b2e0-d6777482f040","p007",null,true,null],
      ["54bb0211-b4c1-47d7-bad2-488a5d8ef580","1794d939-ca34-40f9-b2e0-d6777482f040","p063",null,true,null],
      ["5500e46e-0859-4f92-8b96-7d31719d6364","1794d939-ca34-40f9-b2e0-d6777482f040","p046",null,true,null],
      ["563ec035-a669-4190-8292-7e8d7226cd40","1794d939-ca34-40f9-b2e0-d6777482f040","p047",null,true,null],
      ["56e62913-76eb-467a-962a-22c3e4b80eb4","1794d939-ca34-40f9-b2e0-d6777482f040","p074",null,true,null],
      ["56ed806c-b393-48f2-b07b-4eb6dfef5f12","1794d939-ca34-40f9-b2e0-d6777482f040","p053",null,true,null],
      ["57d7a610-6732-4692-a423-bc91aa40e7c7","1794d939-ca34-40f9-b2e0-d6777482f040","p085",null,true,null],
      ["580d07c8-13f8-4650-a89a-43ae7c5b7404","1794d939-ca34-40f9-b2e0-d6777482f040","p106",null,true,null],
      ["582d646d-17fa-4f50-8898-e480878b1b4d","1794d939-ca34-40f9-b2e0-d6777482f040","p057",null,true,null],
      ["592e0efc-d910-470d-ac29-e73886f23c0d","1794d939-ca34-40f9-b2e0-d6777482f040","p061",null,true,null],
      ["598edbb2-60da-4288-bb91-86bc6101adae","1794d939-ca34-40f9-b2e0-d6777482f040","p008",null,true,null],
      ["5b236b4e-bc77-4ddf-90e0-bbba6fd1ff78","1794d939-ca34-40f9-b2e0-d6777482f040","p084",null,true,null],
      ["5c6409f6-ab5b-488d-af19-9fe34a4d8e75","1794d939-ca34-40f9-b2e0-d6777482f040","p033",null,true,null],
      ["5cacbfc1-10ba-4f57-8232-36a272a1519b","1794d939-ca34-40f9-b2e0-d6777482f040","p012",null,true,null],
      ["5cd3624b-f4be-493d-ab43-2f813719f5f2","1794d939-ca34-40f9-b2e0-d6777482f040","p026",null,true,null],
      ["5d48bcde-ef0f-438e-a251-9cfd95004232","1794d939-ca34-40f9-b2e0-d6777482f040","p027",null,true,null],
      ["5f41f42c-e611-4511-ae74-a36521be5509","1794d939-ca34-40f9-b2e0-d6777482f040","p014",null,true,null],
      ["62522861-f867-4ae7-9ef3-edf4f6e5d75e","1794d939-ca34-40f9-b2e0-d6777482f040","p120",null,true,null],
      ["645898f5-4991-4d8b-ad45-1f690ab7eaf5","1794d939-ca34-40f9-b2e0-d6777482f040","p088",null,true,null],
      ["67009c93-efe7-4031-9c7d-ad345cd2006c","1794d939-ca34-40f9-b2e0-d6777482f040","p075",null,true,null],
      ["6759a1d7-2eb3-40fd-953e-4f2c0c791554","1794d939-ca34-40f9-b2e0-d6777482f040","p020",null,true,null],
      ["69cfe483-62d3-4064-9c8a-2ce653e81caf","1794d939-ca34-40f9-b2e0-d6777482f040","p102",null,true,null],
      ["6d58366c-fb9e-4be5-b26e-630cef55fd9c","1794d939-ca34-40f9-b2e0-d6777482f040","p045",null,true,null],
      ["6dbfa678-fff7-4198-a92d-37622743c81f","1794d939-ca34-40f9-b2e0-d6777482f040","p023",null,true,null],
      ["714db16c-4aef-4630-b41e-180227689db0","1794d939-ca34-40f9-b2e0-d6777482f040","p011",null,true,null],
      ["718d2b27-6dd2-4beb-b8de-a9aa28d0a2b7","1794d939-ca34-40f9-b2e0-d6777482f040","p035",null,true,null],
      ["72465192-84f0-4d04-b591-23a1a842c0ba","1794d939-ca34-40f9-b2e0-d6777482f040","p018",null,true,null],
      ["809292d9-7269-4fae-8e32-81c9ac2a0d1b","1794d939-ca34-40f9-b2e0-d6777482f040","p016",null,true,null],
      ["8112ecbf-a924-43f8-8fec-0b4ef9cd4266","1794d939-ca34-40f9-b2e0-d6777482f040","p017",null,true,null],
      ["8175cd2a-8e18-4857-a7b5-e8f044ecde4e","1794d939-ca34-40f9-b2e0-d6777482f040","p083",null,true,null],
      ["83a6e46e-6616-48f0-a655-c87cdd0020a3","1794d939-ca34-40f9-b2e0-d6777482f040","p013",null,true,null],
      ["86a26f24-5d97-4358-b282-45e05d0cff96","1794d939-ca34-40f9-b2e0-d6777482f040","p080",null,true,null],
      ["86bf4987-5309-4f11-8b07-cd4512d2e107","1794d939-ca34-40f9-b2e0-d6777482f040","p059",null,true,null],
      ["8856f95d-f9c0-4ccc-bd8e-7872fa951abe","1794d939-ca34-40f9-b2e0-d6777482f040","p031",null,true,null],
      ["8a684a59-f32c-44e0-a082-7d22d473dbd1","1794d939-ca34-40f9-b2e0-d6777482f040","p109",null,true,null],
      ["8b927712-6d7b-4edf-be00-8a47bcb82f28","1794d939-ca34-40f9-b2e0-d6777482f040","p034",null,true,null],
      ["8cdd682f-feea-44e8-a006-14b2a92c758e","1794d939-ca34-40f9-b2e0-d6777482f040","p068",null,true,null],
      ["8d9157ad-fa43-42b8-afdd-3342ffeee0f6","1794d939-ca34-40f9-b2e0-d6777482f040","p069",null,true,null],
      ["8ebbc855-92cb-468e-8c92-530b8420cc12","1794d939-ca34-40f9-b2e0-d6777482f040","p064",null,true,null],
      ["92b7cc22-5ca2-4f3a-8fa8-3117f11c9b77","1794d939-ca34-40f9-b2e0-d6777482f040","p087",null,true,null],
      ["96126b86-87d8-4913-918e-574d6cb0f614","1794d939-ca34-40f9-b2e0-d6777482f040","p119",null,true,null],
      ["976527fe-a4a6-49b4-9895-cea02d4c1897","1794d939-ca34-40f9-b2e0-d6777482f040","p096",null,true,null],
      ["9af2cbba-0434-47bc-afcd-7382ea316422","1794d939-ca34-40f9-b2e0-d6777482f040","p112",null,true,null],
      ["9c5453b5-ec30-4623-b445-e95ef82fad3e","1794d939-ca34-40f9-b2e0-d6777482f040","p030",null,true,null],
      ["9f1b0f59-4705-4523-9c6c-a5af73a84c14","1794d939-ca34-40f9-b2e0-d6777482f040","p009",null,true,null],
      ["a0791fe2-80f9-4e86-a69a-70af68d4478a","1794d939-ca34-40f9-b2e0-d6777482f040","p072",null,true,null],
      ["a1799cd3-390b-4eaf-bf21-c76e04f06b2c","1794d939-ca34-40f9-b2e0-d6777482f040","p005",null,true,null],
      ["a31bbf39-2c47-4e89-b19e-7cec64f49e8a","1794d939-ca34-40f9-b2e0-d6777482f040","p070",null,true,null],
      ["a8178f16-d2b6-4a24-abfa-a56d5b2acc5e","1794d939-ca34-40f9-b2e0-d6777482f040","p037",null,true,null],
      ["a847ce5d-d54b-44e8-95d7-35e5f006beb4","1794d939-ca34-40f9-b2e0-d6777482f040","p107",null,true,null],
      ["a8c35a51-5dc4-4c5d-a0f9-da902f1d03dc","1794d939-ca34-40f9-b2e0-d6777482f040","p055",null,true,null],
      ["a94bd8af-3aef-4217-8320-dd8da360dccd","1794d939-ca34-40f9-b2e0-d6777482f040","p125",null,true,null],
      ["aac5d739-7903-4084-9064-681101f9cf50","1794d939-ca34-40f9-b2e0-d6777482f040","p092",null,true,null],
      ["b21f3eb8-ff8f-4f96-b261-10aa6ef33a5c","1794d939-ca34-40f9-b2e0-d6777482f040","p099",null,true,null],
      ["b52acb1c-4df0-4a53-a4f2-c23de704533e","1794d939-ca34-40f9-b2e0-d6777482f040","p078",null,true,null],
      ["b52d204c-a773-4103-8de1-1ee93c8f7cc2","1794d939-ca34-40f9-b2e0-d6777482f040","p032",null,true,null],
      ["b53747e9-df29-4fea-8f98-9fef99252e5e","1794d939-ca34-40f9-b2e0-d6777482f040","p006",null,true,null],
      ["b651d970-d083-4444-9ac9-5b356aa3a4ee","1794d939-ca34-40f9-b2e0-d6777482f040","p121",null,true,null],
      ["b7a54fa1-c562-4695-80a5-4127c1a0a039","1794d939-ca34-40f9-b2e0-d6777482f040","prod-2e18be5a",null,true,null],
      ["bacd0d99-2d6d-4859-af2b-e763513aeed1","1794d939-ca34-40f9-b2e0-d6777482f040","p115",null,true,null],
      ["c4de240c-47dc-4cdd-8d30-e90cf161d4d0","1794d939-ca34-40f9-b2e0-d6777482f040","p073",null,true,null],
      ["c52894da-3d1d-450e-9487-26d8cd692362","1794d939-ca34-40f9-b2e0-d6777482f040","p098",null,true,null],
      ["c5e149f8-2696-43d1-b503-f1d64d226c2e","1794d939-ca34-40f9-b2e0-d6777482f040","p103",null,true,null],
      ["c61e9b54-5c17-4f30-a6d2-f5fe21116242","1794d939-ca34-40f9-b2e0-d6777482f040","p039",null,true,null],
      ["cdd4ffda-0dbb-48da-a308-83a508e57bc4","1794d939-ca34-40f9-b2e0-d6777482f040","p089",null,true,null],
      ["d1ce4630-4a41-4bde-b281-f93b9056759f","1794d939-ca34-40f9-b2e0-d6777482f040","p101",null,true,null],
      ["d3e40d87-44d1-4420-9fe1-50cc5f0314fd","1794d939-ca34-40f9-b2e0-d6777482f040","p056",null,true,null],
      ["d748dfbc-9dbf-49e1-8dad-4d680d52733a","1794d939-ca34-40f9-b2e0-d6777482f040","p042",null,true,null],
      ["d8c5166b-dd05-443c-b28e-2386061b0a5e","1794d939-ca34-40f9-b2e0-d6777482f040","p091",null,true,null],
      ["d95c1542-9954-4e4e-98cd-69c911ca27d2","1794d939-ca34-40f9-b2e0-d6777482f040","p062",null,true,null],
      ["da1f3256-390c-4365-bb93-9baa93a0ca1c","1794d939-ca34-40f9-b2e0-d6777482f040","p095",null,true,null],
      ["dabb5a4b-dec0-4f62-9a60-ecd02241ba9f","1794d939-ca34-40f9-b2e0-d6777482f040","p003",null,true,null],
      ["dbfd40a6-967c-4fb0-ae36-0ab7f6c3e0c7","1794d939-ca34-40f9-b2e0-d6777482f040","p015",null,true,null],
      ["e0612853-09e5-45dd-9bf6-73f85b6606a8","1794d939-ca34-40f9-b2e0-d6777482f040","p058",null,true,null],
      ["e1c4b61e-b37a-4eb1-a0d6-74c6306d502c","1794d939-ca34-40f9-b2e0-d6777482f040","p081",null,true,null],
      ["e4ee2dbc-74f2-408c-b303-ef130f11754f","1794d939-ca34-40f9-b2e0-d6777482f040","p113",null,true,null],
      ["e6947abb-43f2-4027-a2ab-23b94e403d35","1794d939-ca34-40f9-b2e0-d6777482f040","p118",null,true,null],
      ["e957c345-eae3-47f0-b5e4-2267b8923331","1794d939-ca34-40f9-b2e0-d6777482f040","p108",null,true,null],
      ["e9cf70e2-03c4-4073-93b7-46f4264a0f87","1794d939-ca34-40f9-b2e0-d6777482f040","p116",null,true,null],
      ["ed32af93-c6cb-484d-b706-ba9a860450a1","1794d939-ca34-40f9-b2e0-d6777482f040","p051",null,true,null],
      ["ed79d606-9d2b-472e-8cf0-ed3698989913","1794d939-ca34-40f9-b2e0-d6777482f040","p028",null,true,null],
      ["f0c197ce-8fe6-4ac6-a930-1bf0a19b4a71","1794d939-ca34-40f9-b2e0-d6777482f040","p114",null,true,null],
      ["f294bbd8-9443-46a4-8d36-4d2d735eafc0","1794d939-ca34-40f9-b2e0-d6777482f040","p050",null,true,null],
      ["f2b69801-b1eb-4eed-8ca6-50997f2d2704","1794d939-ca34-40f9-b2e0-d6777482f040","p082",null,true,null],
      ["f3c01e27-de52-4d73-a1c1-ddfd9ee62dfe","1794d939-ca34-40f9-b2e0-d6777482f040","p097",null,true,null],
      ["f6b1ad6e-f167-427e-a09b-31a8c36ffbff","1794d939-ca34-40f9-b2e0-d6777482f040","p043",null,true,null],
      ["f7a194f8-a89d-4a10-a6ae-e282cd9b356c","1794d939-ca34-40f9-b2e0-d6777482f040","p041",null,true,null],
      ["fa20f6b1-a23a-4d9c-a75c-530f5b4c16cd","1794d939-ca34-40f9-b2e0-d6777482f040","p104",null,true,null],
      ["fc02be56-1367-4a92-aaf2-d2e833793db6","1794d939-ca34-40f9-b2e0-d6777482f040","p079",null,true,null],
      ["fe41b4d4-4861-4188-ad72-2d711f069d3e","1794d939-ca34-40f9-b2e0-d6777482f040","p038",null,true,null],
      ["fe601d37-2472-4016-b30d-100ce91f0dfe","1794d939-ca34-40f9-b2e0-d6777482f040","p025",null,true,null],
    ];
    let gbpInserted = 0;
    for (const [id, group_buy_id, product_id, price_override, active, sort_order] of groupBuyProducts) {
      // Skip if product doesn't exist in products table
      const prodCheck = await client.query(`SELECT id FROM products WHERE id=$1`, [product_id]);
      if (prodCheck.rows.length === 0) continue;
      await client.query(
        `INSERT INTO group_buy_products (id, group_buy_id, product_id, price_override, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [id, group_buy_id, product_id, price_override, active, sort_order]
      );
      gbpInserted++;
    }
    console.log(`  -> ${gbpInserted} rows inserted (${groupBuyProducts.length - gbpInserted} skipped - product not found)`);

    // 13. Lab tests (74 of 353 provided)
    console.log("Importing lab_tests (74 of 353 provided)...");
    const labTests = [
      [1,"91806","https://janoshik.com/tests/91806-ghk_100mg_HK1001125_KTLJ2S1KCZ7Y","GHK",100,"Uther","HK1001125",null,null,null,null,null,false,false],
      [2,"91819","https://janoshik.com/tests/91819-Ghkcu_50mg_HK501126HK5011261_DR8F4EUKM5GA","GHK-Cu",50,"Uther",null,null,null,null,null,null,false,false],
      [3,"91820","https://janoshik.com/tests/91820-Livagen_20mg_LIV201126_MJTERTJ7IKZ2","Livagen",20,"Uther","LIV201126",null,null,null,null,null,false,false],
      [4,"92172","https://janoshik.com/tests/92172-Cortagen_20mg_CORGEN201111_BIHMLJAM1ZNN","Cortagen",20,"Uther","CORGEN201111",null,null,null,null,null,false,false],
      [5,"92154","https://janoshik.com/tests/92154-Tb_500_10mg_TB4101127_KGZGJN4C41FY","TB-500",10,"Uther","TB4101127",null,null,null,null,null,false,false],
      [6,"92157","https://janoshik.com/tests/92157-motsc_20mg_MO201127_LLTGHRRR22HW","MOTS-C",20,"Uther","MO201127",null,null,null,null,null,false,false],
      [7,"92167","https://janoshik.com/tests/92167-semax_10mg_SX101110_TS8GT7L5F6PG","Semax",10,"Uther","SX101110",null,null,null,null,null,false,false],
      [8,"92169","https://janoshik.com/tests/92169-bpc_157_10mg_BP101110_KMZTY8DBGSA8","BPC-157",10,"Uther","BP101110",null,null,null,null,null,false,false],
      [9,"92174","https://janoshik.com/tests/92174-Cartalax_20mg_CALAX201111_97JA3RPCNEY4","Cartalax",20,"Uther","CALAX201111",null,null,null,null,null,false,false],
      [10,"92176","https://janoshik.com/tests/92176-ipa_10mg_IP101112_BDNXMZTPPMLN","Ipamorelin",10,"Uther","IP101112",null,null,null,null,null,false,false],
      [11,"92171","https://janoshik.com/tests/92171-na_semax_10mg_NASX101111_I9NQCBVVIQ95","NA-Semax",10,"Uther","NASX101111",null,null,null,null,null,false,false],
      [12,"92175","https://janoshik.com/tests/92175-tbbp_1010_TB10101112_KPCSWF7GVR7V","TB4 + BPC-157",null,"Uther","TB10101112",null,null,null,null,null,false,false],
      [13,"91807","https://janoshik.com/tests/91807-Semax_10mg_SX101125_X87K3NXG143D","Semax",10,"Uther","SX101125",null,null,null,null,null,false,false],
      [14,"91803","https://janoshik.com/tests/91803-Bpc_10mg_BP101124_Q86HV84BFYL3","BPC-157",10,"Uther","BP101124",null,null,null,null,null,false,false],
      [15,"92162","https://janoshik.com/tests/92162-ipa_10mg_IP101127_5GX81BILMQDS","Ipamorelin",10,"Uther","IP101127",null,null,null,null,null,false,false],
      [16,"92155","https://janoshik.com/tests/92155-klow_KL801127_V8YSQK9JHQS9","K-Low",null,"Uther","KL801127",null,null,null,null,null,false,false],
      [17,"92159","https://janoshik.com/tests/92159-Coremend_CORE451127_GWQGWDB7UD8H","Coremend",null,"Uther","CORE451127",null,null,null,null,null,false,false],
      [18,"92840","https://janoshik.com/tests/92840-PT141_10mg_PT101128_R9EG3IEJLVF5","Pt141",10,"Uther","PT101128",null,null,null,null,null,false,false],
      [19,"92853","https://janoshik.com/tests/92853-kpv_10mg_KP101129_MLDQC7YR6V78","KPV",10,"Uther","KP101129",null,null,null,null,null,false,false],
      [20,"92859","https://janoshik.com/tests/92859-cjc_no_dac10mg_CJND101129_GT3YPNK578YM","CJC-1295 (no DAC)",10,"Uther","CJND101129",null,null,null,null,null,false,false],
      [21,"92862","https://janoshik.com/tests/92862-Cjcipa_1010_cI10101130_986IXDSZFAE9","CJC + Ipamorelin",null,"Uther",null,null,null,null,null,null,false,false],
      [22,"92863","https://janoshik.com/tests/92863-cjcipa_55mg_CI551130_TIQ1NU68H4GH","CJC + Ipamorelin",55,"Uther","CI551130",null,null,null,null,null,false,false],
      [23,"92844","https://janoshik.com/tests/92844-PT141_10mg_PT101128_LDRDKT29QK3A","Pt141",10,"Uther","PT101128",null,null,null,null,null,false,false],
      [24,"92847","https://janoshik.com/tests/92847-reta_50mg_RE501128_6BEI9BG1Y9HW","Retatrutide",50,"Uther","RE501128",null,null,null,null,null,false,false],
      [25,"92851","https://janoshik.com/tests/92851-Tir30mg_ZE301129_DWTHLF1M8N8Y","Tirzepatide",30,"Uther","ZE301129",null,null,null,null,null,false,false],
      [26,"92855","https://janoshik.com/tests/92855-kpv_10mg_KP101129_PLSK1D8LUTKZ","KPV",10,"Uther","KP101129",null,null,null,null,null,false,false],
      [27,"92861","https://janoshik.com/tests/92861-cjc_no_dac10mg_CJND101129_HC1P3CNT6SA9","CJC-1295 (no DAC)",10,"Uther","CJND101129",null,null,null,null,null,false,false],
      [28,"92867","https://janoshik.com/tests/92867-LL37_5mg_LL51130_D6NA7T5MXE93","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [29,"92842","https://janoshik.com/tests/92842-PT141_10mg_PT101128_9UDPXQ3WM64T","Pt141",10,"Uther","PT101128",null,null,null,null,null,false,false],
      [30,"92857","https://janoshik.com/tests/92857-tesa_10mg_TE101129_GPMYU95ZREI3","Tesamorelin",10,"Uther","TE101129",null,null,null,null,null,false,false],
      [31,"92860","https://janoshik.com/tests/92860-cjc_no_dac10mg_CJND101129_SJQVXP3CYISJ","CJC-1295 (no DAC)",10,"Uther","CJND101129",null,null,null,null,null,false,false],
      [32,"92173","https://janoshik.com/tests/92173-SS31_50mg_SS501111_9RNDSTSMQ175","SS-31",50,"Uther","SS501111",null,null,null,null,null,false,false],
      [33,"92846","https://janoshik.com/tests/92846-reta_50mg_RE501128_XFHB4MTD82TV","Retatrutide",50,"Uther","RE501128",null,null,null,null,null,false,false],
      [34,"92850","https://janoshik.com/tests/92850-Tir30mg_ZE301129_DD6W93EDBG34","Tirzepatide",30,"Uther","ZE301129",null,null,null,null,null,false,false],
      [35,"92873","https://janoshik.com/tests/92873-Na_selank_50mg_NASK501130_TAQ4XNY2BHYT","NA-Selank",50,"Uther","NASK501130",null,null,null,null,null,false,false],
      [36,"92879","https://janoshik.com/tests/92879-Na_semax_50mg_NASX501130_81JQ27B6IXNG","NA-Semax",50,"Uther","NASX501130",null,null,null,null,null,false,false],
      [37,"92865","https://janoshik.com/tests/92865-LL37_5mg_LL51130_7D29U6J5N9HX","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [38,"93199","https://janoshik.com/tests/93199-glow_GL701204_R74PCJVXZPNI","Glow",null,"Uther","GL701204",null,null,null,null,null,false,false],
      [39,"93073","https://janoshik.com/tests/93073-Adipotide_10mg_ADI101201_PQ4MVYE3R7TB","Adipotide",10,"Uther","ADI101201",null,null,null,null,null,false,false],
      [40,"93074","https://janoshik.com/tests/93074-Fox04_10mg_FO101201_6FDLSCMUDAHN","FOXO4-DRI",10,"Uther","FO101201",null,null,null,null,null,false,false],
      [41,"93075","https://janoshik.com/tests/93075-Motsc_10mg_MO101201_WNPL1PP762QK","MOTS-C",10,"Uther","MO101201",null,null,null,null,null,false,false],
      [42,"93076","https://janoshik.com/tests/93076-Semax_10mg_SX101204_3AJWDJLYNZUK","Semax",10,"Uther","SX101204",null,null,null,null,null,false,false],
      [43,"93077","https://janoshik.com/tests/93077-tesaipa103_TI1031202_NN876YM37P8E","Tesamorelin + Ipamorelin",null,"Uther","TI1031202",null,null,null,null,null,false,false],
      [44,"93072","https://janoshik.com/tests/93072-sema10mg_OZ101201_GUAHMNTXBT7X","Semaglutide",10,"Uther","OZ101201",null,null,null,null,null,false,false],
      [45,"93078","https://janoshik.com/tests/93078-reta20mg_RE201202_RIBKBX6GVQCZ","Retatrutide",20,"Uther","RE201202",null,null,null,null,null,false,false],
      [46,"93195","https://janoshik.com/tests/93195-Tir_60mg_ZE601204_NJGRTH1KIG1P","Tirzepatide",60,"Uther","ZE601204",null,null,null,null,null,false,false],
      [47,"93200","https://janoshik.com/tests/93200-Tir_15mg_ZE151205_UD3E75X1ZY1Y","Tirzepatide",15,"Uther","ZE151205",null,null,null,null,null,false,false],
      [48,"93203","https://janoshik.com/tests/93203-ghkcu_100mg_HK1001205_YZFZ5K8A2DRC","GHK-Cu",100,"Uther","HK1001205",null,null,null,null,null,false,false],
      [49,"93355","https://janoshik.com/tests/93355-LL37_5mg_LL51130_DUX1VMEMHUPI","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [50,"93080","https://janoshik.com/tests/93080-tesa_20mg_TE201202_HV3GH7CWTN9C","Tesamorelin",20,"Uther","TE201202",null,null,null,null,null,false,false],
      [51,"93082","https://janoshik.com/tests/93082-bpc157_10mg_BP101201_BNHQ3KTBFNTS","BPC-157",10,"Uther","BP101201",null,null,null,null,null,false,false],
      [52,"93083","https://janoshik.com/tests/93083-ghkcu_50mg_HK501204_FV1YXKR9MFHE","GHK-Cu",50,"Uther","HK501204",null,null,null,null,null,false,false],
      [53,"93084","https://janoshik.com/tests/93084-epitalon_10mg_EP101204_R3JXWHK9MPXL","Epitalon",10,"Uther","EP101204",null,null,null,null,null,false,false],
      [54,"93085","https://janoshik.com/tests/93085-ss31_50mg_SS501204_BFBQHM7N2SGW","SS-31",50,"Uther","SS501204",null,null,null,null,null,false,false],
      [55,"93086","https://janoshik.com/tests/93086-ozempic_10mg_OZ101205_KDTX7DTKJQUM","Semaglutide",10,"Uther","OZ101205",null,null,null,null,null,false,false],
      [56,"93087","https://janoshik.com/tests/93087-nad500_NA5001205_T7LXAPB4PUHF","NAD+",500,"Uther","NA5001205",null,null,null,null,null,false,false],
      [57,"93088","https://janoshik.com/tests/93088-kpv30mg_KP301205_JYQK1VY72I2N","KPV",30,"Uther","KP301205",null,null,null,null,null,false,false],
      [58,"93089","https://janoshik.com/tests/93089-tb500_10mg_TB4101205_ZEPUVAMHCRXY","TB-500",10,"Uther","TB4101205",null,null,null,null,null,false,false],
      [59,"93090","https://janoshik.com/tests/93090-na_selank_10mg_NASK101205_BIQWYVG62NGM","NA-Selank",10,"Uther","NASK101205",null,null,null,null,null,false,false],
      [60,"93091","https://janoshik.com/tests/93091-cjc1295dac_5mg_CJD51205_MGXZUQ3SG4X8","CJC-1295 DAC",5,"Uther","CJD51205",null,null,null,null,null,false,false],
      [61,"93204","https://janoshik.com/tests/93204-tir15mg_ZE151205_KKUA8CIMIWFT","Tirzepatide",15,"Uther","ZE151205",null,null,null,null,null,false,false],
      [62,"93205","https://janoshik.com/tests/93205-reta40mg_RE401205_GQSMDL8LNLRI","Retatrutide",40,"Uther","RE401205",null,null,null,null,null,false,false],
      [63,"93206","https://janoshik.com/tests/93206-cagri10mg_CA101205_BR1BHRVAWKFS","Cagrilintide",10,"Uther","CA101205",null,null,null,null,null,false,false],
      [64,"93354","https://janoshik.com/tests/93354-LL37_5mg_LL51130_EC8RU75J8JR2","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [65,"93356","https://janoshik.com/tests/93356-LL37_5mg_LL51130_YWVH5QTFUNHJ","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [66,"93357","https://janoshik.com/tests/93357-LL37_5mg_LL51130_HBQNV7G4FWRP","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [67,"93358","https://janoshik.com/tests/93358-LL37_5mg_LL51130_ZRPKX3FIJLHW","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [68,"93359","https://janoshik.com/tests/93359-LL37_5mg_LL51130_PXZQ4KFHQ1NC","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [69,"93360","https://janoshik.com/tests/93360-LL37_5mg_LL51130_NYDTM7RPQFUZ","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [70,"93361","https://janoshik.com/tests/93361-LL37_5mg_LL51130_GJMRW8DKECVL","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [71,"93362","https://janoshik.com/tests/93362-LL37_5mg_LL51130_TRLHP5KVWUQM","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [72,"93363","https://janoshik.com/tests/93363-LL37_5mg_LL51130_VHJQPF3KZMEX","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [73,"93364","https://janoshik.com/tests/93364-LL37_5mg_LL51130_RFKZM8BXJNTH","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
      [74,"93365","https://janoshik.com/tests/93365-LL37_5mg_LL51130_QPJLKZ4RNHMT","LL-37",5,"Uther","LL51130",null,null,null,null,null,false,false],
    ];
    for (const [id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes, is_third_party_test, pending] of labTests) {
      await client.query(
        `INSERT INTO lab_tests (id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes, is_third_party_test, pending, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, janoshik_id, url, peptide_name, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes, is_third_party_test, pending]
      );
    }
    await client.query(`SELECT setval('lab_tests_id_seq', (SELECT MAX(id) FROM lab_tests))`);
    console.log(`  -> ${labTests.length} rows (partial - 74 of 353)`);

    // 14. Lookup attempts
    console.log("Importing lookup_attempts...");
    const lookupAttempts = [
      { id: "00b6e2da-51eb-431d-9c07-4ef51d49febd", identifier: "@kirstymc69", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T18:29:07.459Z" },
      { id: "010e3c6e-9a46-4ecc-8f5e-4e32c4609b84", identifier: "@entangledpep", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-18T22:19:09.328Z" },
      { id: "02c7cedc-bfba-432c-be39-e7ca18c4fc86", identifier: "lizzie2391", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:07:14.378Z" },
      { id: "0441b10e-1f8e-421b-bfee-c9e9ade21b80", identifier: "@mkp_uk", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-27T13:20:48.365Z" },
      { id: "053f5f61-0c09-461e-b1e8-ff42a65e8deb", identifier: "@mkp-uk", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T10:46:13.195Z" },
      { id: "065f3c9f-a41a-4e1b-9028-bbc7e16edce9", identifier: "@JohnCenaCMe", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:14:18.134Z" },
      { id: "076db42e-27dd-4e21-8f18-80e25de888d4", identifier: "@6262micky", failed_attempts: 3, blocked_until: null, last_attempt_at: "2026-03-23T13:07:16.893Z" },
      { id: "08d5b04c-94cc-45e2-9ef0-e6e20eaf6a6f", identifier: "@1poundfish", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-04-01T10:37:35.639Z" },
      { id: "09c9484e-1ce1-4f57-a2be-2454f3ba7ee0", identifier: "@ADev81", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-29T22:49:15.889Z" },
      { id: "09fdde17-9ea0-445c-808c-7a13e0843a62", identifier: "@jakeh1992", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:15:41.238Z" },
      { id: "0d74a7a4-0d6e-4cf3-b432-af2e5c42c9fa", identifier: "adev81", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:14:02.573Z" },
      { id: "0df6d9fd-ea39-49ee-bcf2-97f10d4c1d47", identifier: "@atzz_mm", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-30T15:48:06.063Z" },
      { id: "0f8e4eeb-c20c-4849-884b-6b7fe1e88a2d", identifier: "@OC1313", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T05:41:24.474Z" },
      { id: "12c1ea94-84ed-4d24-9c2b-d82c1bc41d86", identifier: "@johncenacme", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:14:39.434Z" },
      { id: "1414f02e-8ddf-4e28-8bd6-8e59f1e9bcad", identifier: "@Reeper90", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T06:18:26.471Z" },
      { id: "17e90cfc-c6e4-4f14-88fc-68e87ec6dbcc", identifier: "@carpediem831", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-28T19:56:43.801Z" },
      { id: "1a8a8af6-85e8-4e8c-8491-a5de0c7af2d0", identifier: "@vasendak", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-04-01T13:02:52.900Z" },
      { id: "1e4edd7d-c5f5-4e65-88ef-29bec1d5b20c", identifier: "johncenacme", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:10:04.303Z" },
      { id: "203e4d8f-1c2a-4673-ab98-ff60c93fd22c", identifier: "@noshoesnoservice", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-18T20:20:09.046Z" },
      { id: "24c66c4a-5de8-4cb8-b64c-2d3c6437fb9e", identifier: "@mkp-ik", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T10:46:07.550Z" },
      { id: "2d59c0de-b7a2-4df9-a9e2-38a37e001d6a", identifier: "@ironmanjamie", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-25T14:56:25.580Z" },
      { id: "32d7c8d3-0c10-452f-a9bb-3b7cfc87c869", identifier: "@lewrollz", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T08:56:02.622Z" },
      { id: "358e5f69-64e2-4bfa-9f09-a2b03e3f20b3", identifier: "@mkp", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:10:05.674Z" },
      { id: "36db71ed-de15-4f71-85e0-a8c6a6cf9e1f", identifier: "@untamedchazy", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-22T21:07:38.309Z" },
      { id: "37d50e46-2dfc-4b4d-a9c5-7fc0f6e81624", identifier: "@prem_peps", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-21T10:50:54.054Z" },
      { id: "39c7b3df-5099-4e3f-86e3-8f3f23e7d39b", identifier: "@scott", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-27T17:00:58.891Z" },
      { id: "3a7f29c3-7c91-4f24-97f9-8d3be7e7e831", identifier: "@HAGRIDV99", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-18T20:20:09.000Z" },
      { id: "3e60e9a8-27cc-4d42-ba51-bb7f2de2bd04", identifier: "@andyt2888", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-22T21:00:02.744Z" },
      { id: "3f99a88d-0c9e-4a20-b2d7-8f0b8a4f5987", identifier: "@dmacd9", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-22T13:46:23.895Z" },
      { id: "40d7f3a2-1e99-4fa1-a5c2-e62c20d24b4e", identifier: "clarke", failed_attempts: 3, blocked_until: null, last_attempt_at: "2026-03-20T11:19:24.612Z" },
      { id: "42beba51-47c1-481e-a90d-ebfab9a5ef3b", identifier: "@J4mes_R", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-21T13:13:46.291Z" },
      { id: "4403dfe3-1f6e-4e7e-9cd8-26de29dea9c6", identifier: "@Zii", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-22T07:26:33.453Z" },
      { id: "462b9de0-2ea5-4c77-8e02-9e5ee90e4e7a", identifier: "@K_andL", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T16:57:42.113Z" },
      { id: "47e8e6a9-0928-4f20-80c9-12a1de05d5b6", identifier: "@JohnnyWalker70", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-21T17:27:18.073Z" },
      { id: "4a4e56f9-a0e9-4f2a-b4cf-27f09c7f34f4", identifier: "@Jayjo8", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-04-02T16:46:03.849Z" },
      { id: "4b30e0b2-9ebb-4f7a-8e2d-6ef5e1f91ac3", identifier: "@hotlinerider", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-04-01T01:09:58.175Z" },
      { id: "4e18cc92-8b19-4ca3-b1c8-4d5bf4f71e4f", identifier: "@NeverEvenSeenIt", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T07:29:00.265Z" },
      { id: "542a5c71-e9a8-41b6-9cca-84b4b8e0b01e", identifier: "@j_p_b8_2", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-22T08:34:18.679Z" },
      { id: "59c7d4d8-a68b-4b2e-abe9-d3e6e7e8e91f", identifier: "@slimsimma", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T07:44:55.248Z" },
      { id: "5c3c7ef6-36fb-41cd-b0ea-5eba38adb434", identifier: "@panth89", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-18T20:20:08.921Z" },
      { id: "5e0c5f5e-51b2-4f10-a8b4-3e88c17e7a3b", identifier: "@kenupfront", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-04-01T14:14:29.265Z" },
      { id: "64b7f8fc-3e7b-4d04-b1c9-87d0d07f7d53", identifier: "@josie_uk", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-29T15:20:55.199Z" },
      { id: "7027b421-2c5a-4e3c-90c0-4b2e10d7d7f5", identifier: "@grundlefly1", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-29T13:30:58.232Z" },
      { id: "73f5e8ad-1cba-4f63-94f8-d08b4d9e6a7f", identifier: "@5egergfr", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-19T17:00:15.099Z" },
      { id: "7fac63bf-3fbc-4d3b-b66c-b37ef1a82d09", identifier: "@Nemo", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-21T06:31:03.388Z" },
      { id: "8241a6cd-02a6-4a9d-b5e3-3edb2e1e2c1e", identifier: "@ploddingalong", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-27T13:37:54.387Z" },
      { id: "86d4f7e5-c2b4-4c98-9b3f-4c3e24c6e6c7", identifier: "@pink ladybug", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T22:56:00.952Z" },
      { id: "9291d7e0-7f43-4b8e-b2c8-8f3a7e9e8e7c", identifier: "@Clarke", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T13:23:13.824Z" },
      { id: "9a3dc9fb-4cab-4e09-bc9c-3cd9d9d0d0d3", identifier: "@wefewfwf", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-19T23:23:29.847Z" },
      { id: "a1c5f8d3-7b9a-4b87-8e4f-4c8c8e7e7e6d", identifier: "miki19844", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:10:03.316Z" },
      { id: "a1f63e2b-8d4a-4c4b-9bcd-c13f4f8f8f7e", identifier: "@miki19844", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:10:03.791Z" },
      { id: "af7d3d2c-5e9b-4d7a-b8f3-9e4e3e2e2e1f", identifier: "@lizzie2391", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T11:10:07.350Z" },
      { id: "b1e6c7d8-3f9a-4e8b-b7c2-7f3f2f1f1f0e", identifier: "@mkp_uk", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-20T10:54:27.432Z" },
      { id: "c3f8e9d0-1a2b-4c6d-a5e4-5f4f3f2f2f1f", identifier: "@S S C", failed_attempts: 0, blocked_until: null, last_attempt_at: "2026-03-30T15:48:05.944Z" },
    ];
    for (const row of lookupAttempts) {
      await client.query(
        `INSERT INTO lookup_attempts (id, identifier, failed_attempts, blocked_until, last_attempt_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.identifier, row.failed_attempts, row.blocked_until, row.last_attempt_at]
      );
    }
    console.log(`  -> ${lookupAttempts.length} rows`);

    console.log("\nImport complete!");

    // Print summary counts
    const tables = [
      "delivery_methods","group_buys","accounts","orders","order_line_items",
      "admin_alerts","audit_logs","blood_test_sessions","blood_test_values",
      "fs3_costs","group_buy_delivery_methods","group_buy_products","lab_tests","lookup_attempts"
    ];
    console.log("\nFinal row counts:");
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${res.rows[0].count}`);
    }

  } catch (err) {
    console.error("Import failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
