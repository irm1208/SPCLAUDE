# Google Sheets Setup Guide — Peps Anonymous

## Overview

This guide explains how to connect your Google Sheets spreadsheet to Peps Anonymous as the admin control panel.

**Architecture:**
- Google Sheets = your admin panel (products, prices, postage, order history)
- Apps Script = the bridge that syncs data between Sheets and Peps Anonymous
- Peps Anonymous PostgreSQL database = live data store used by the website

---

## Step 1: Create Your Google Spreadsheet

Create a new Google Spreadsheet with these tabs (exact names matter):

### Tab 1: `Products`

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| Product ID | Product Name | Price | Active | Sort Order |
| prod-001 | Starter Kit | 12.99 | TRUE | 1 |
| prod-002 | Half Kit | 7.50 | TRUE | 2 |

- **Product ID**: A unique identifier (no spaces, e.g. prod-001). Do not change once created.
- **Product Name**: The name shown to customers.
- **Price**: Numeric price (e.g. 12.99).
- **Active**: TRUE or FALSE — FALSE hides the product from customers.
- **Sort Order**: Number controlling display order (1 = first).

### Tab 2: `Postage`

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| Postage ID | Postage Name | Postage Price | Active | Sort Order |
| post-001 | Royal Mail 1st Class | 3.50 | TRUE | 1 |

### Tab 3: `Order Headers`

(This is written automatically by the Apps Script — do not manually edit)

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J | Column K | Column L | Column M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Order ID | Code | Created | Last Updated | Telegram | Delivery | Postage Name | Postage Price | Subtotal | Grand Total | Notes | Status | Admin Notes |

### Tab 4: `Order Line Items`

(Written automatically)

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|---|---|---|---|---|---|---|---|---|
| Order ID | Line Item ID | Product ID | Product Name | Quantity | Unit Price | Line Total | Created | Updated |

### Tab 5: `Total Orders`

In this tab, use Google Sheets formulas to summarize:

**Cell A1:** `Product Name`
**Cell B1:** `Total Quantity`
**Cell C1:** `Total Value`

Example formula for B2 (replace "prod-001" and Sheet name as needed):
```
=SUMIF('Order Line Items'!C:C, "prod-001", 'Order Line Items'!E:E)
```

Or use a pivot table on the Order Line Items tab for an automatic summary.

---

## Step 2: Set Up Apps Script

1. In your spreadsheet, go to **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the following script:

```javascript
// ═══════════════════════════════════════════════════════════
// PEPS ANONYMOUS — GOOGLE APPS SCRIPT
// ═══════════════════════════════════════════════════════════
//
// CONFIGURATION — Update these values:
//
const REPLIT_WEBHOOK_URL = "https://YOUR-APP.replit.app/api/sheets-sync";
const SYNC_SECRET = "YOUR_SYNC_SECRET_HERE"; // Must match SHEETS_SYNC_SECRET in Replit
//
// Tab names — change these if you rename your tabs:
const PRODUCTS_TAB = "Products";
const POSTAGE_TAB = "Postage";
const ORDER_HEADERS_TAB = "Order Headers";
const ORDER_ITEMS_TAB = "Order Line Items";
//
// ═══════════════════════════════════════════════════════════

// Sync products and postage to the website database
function syncProductsAndPostage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Read products
  const productSheet = ss.getSheetByName(PRODUCTS_TAB);
  const productData = productSheet.getDataRange().getValues();
  const products = [];
  for (let i = 1; i < productData.length; i++) {
    const row = productData[i];
    if (!row[0]) continue; // Skip empty rows
    products.push({
      id: String(row[0]),
      name: String(row[1]),
      price: row[2],
      active: row[3] === true || String(row[3]).toUpperCase() === 'TRUE',
      sortOrder: row[4] || null
    });
  }
  
  // Read postage
  const postageSheet = ss.getSheetByName(POSTAGE_TAB);
  const postageData = postageSheet.getDataRange().getValues();
  const postage = [];
  for (let i = 1; i < postageData.length; i++) {
    const row = postageData[i];
    if (!row[0]) continue;
    postage.push({
      id: String(row[0]),
      name: String(row[1]),
      price: row[2],
      active: row[3] === true || String(row[3]).toUpperCase() === 'TRUE',
      sortOrder: row[4] || null
    });
  }
  
  // Send to Replit
  const payload = {
    secret: SYNC_SECRET,
    products: products,
    postage: postage
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(REPLIT_WEBHOOK_URL, options);
  const result = JSON.parse(response.getContentText());
  
  Logger.log('Sync result: ' + JSON.stringify(result));
  SpreadsheetApp.getUi().alert('Sync complete: ' + JSON.stringify(result.synced));
}

// Write a new order to the spreadsheet (called when an order is placed)
// You can call this from a time-based trigger or from the Replit backend
function writeOrderToSheet(orderId, code, telegramUsername, deliveryMethod, postageName, postagePrice, productSubtotal, grandTotal, notes, status, lineItems, createdAt) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Write to Order Headers
  const headersSheet = ss.getSheetByName(ORDER_HEADERS_TAB);
  headersSheet.appendRow([
    orderId,
    code,
    createdAt,
    new Date().toISOString(),
    telegramUsername,
    deliveryMethod,
    postageName,
    postagePrice,
    productSubtotal,
    grandTotal,
    notes || '',
    status,
    '' // Admin notes (blank by default)
  ]);
  
  // Write to Order Line Items
  const itemsSheet = ss.getSheetByName(ORDER_ITEMS_TAB);
  const now = new Date().toISOString();
  for (const item of lineItems) {
    itemsSheet.appendRow([
      orderId,
      item.id,
      item.productId,
      item.productName,
      item.quantity,
      item.unitPrice,
      item.lineTotal,
      now,
      now
    ]);
  }
}

// Create a menu in Google Sheets for easy access
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Peps Anonymous')
    .addItem('Sync Products & Postage to Website', 'syncProductsAndPostage')
    .addToUi();
}

// Optional: Set up a time-based trigger to auto-sync every hour
// Run this function once manually to set up the trigger:
function setupTrigger() {
  ScriptApp.newTrigger('syncProductsAndPostage')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Auto-sync trigger created');
}
```

4. Click **Save** (name it anything, e.g. "PepsAnonymous")

---

## Step 3: Configure Replit

1. Go to your Replit project
2. Open **Secrets** (the padlock icon in the sidebar)
3. Add a new secret:
   - **Key:** `SHEETS_SYNC_SECRET`
   - **Value:** A strong random password (e.g. `MyStr0ngS3cr3t!2024`)

4. Copy your Replit app URL (e.g. `https://peps-anonymous.yourusername.replit.app`)

---

## Step 4: Configure Apps Script

Back in Apps Script, update the top of the script:

```javascript
const REPLIT_WEBHOOK_URL = "https://YOUR-APP.replit.app/api/sheets-sync";
const SYNC_SECRET = "MyStr0ngS3cr3t!2024"; // Same as SHEETS_SYNC_SECRET in Replit
```

---

## Step 5: Test the Sync

1. In Google Sheets, you'll now see a **"Peps Anonymous"** menu
2. Click **Peps Anonymous → Sync Products & Postage to Website**
3. You should see a confirmation alert showing how many products and postage options were synced

---

## Managing Orders in the Spreadsheet

Orders are stored in the Peps Anonymous database. To view them in your spreadsheet, you can:

1. **Manual export**: Query the database and paste results into your sheet
2. **Webhook approach**: Add a call from `orders.ts` to write to Sheets via the Apps Script `doPost` function when orders are created/updated

To set up order writing to Sheets, add a `doPost(e)` function to your Apps Script that accepts order data and writes it to the Order Headers and Order Line Items tabs.

---

## Updating Products Without Code

To change a product price or add a new product:

1. Edit the **Products** tab in your spreadsheet
2. Click **Peps Anonymous → Sync Products & Postage to Website**
3. Changes are live on the website within seconds

To add a new product, just add a new row with a unique Product ID.

To disable a product, set **Active** to `FALSE` — it will no longer appear in orders.

---

## Important Notes

- **Product IDs must never change** once an order has been placed — they are stored in historical orders
- **Postage IDs must never change** once an order has been placed
- Prices in historical orders are frozen at the time of order — changing a price in the sheet won't change old orders
- The website syncs from the spreadsheet — the spreadsheet does NOT automatically update when the website changes (you must trigger a sync)
