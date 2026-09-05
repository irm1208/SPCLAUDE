import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const getPath = (relPath) => {
  const p1 = path.resolve(process.cwd(), 'artifacts/peps-anonymous', relPath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(p2)) return p2;
  throw new Error(`Cannot find file: ${relPath}`);
};

const PAGE_PATH = getPath('src/pages/WholesaleTracking.tsx');
const APP_PATH = getPath('src/App.tsx');
const ACCOUNT_ORDERS_PATH = getPath('src/pages/AccountOrders.tsx');
const WHOLESALE_ORDER_PATH = getPath('src/pages/WholesaleOrder.tsx');
const HOOKS_PATH = getPath('src/hooks/use-account.ts');

const pageContent = fs.readFileSync(PAGE_PATH, 'utf8');
const appContent = fs.readFileSync(APP_PATH, 'utf8');
const accountOrdersContent = fs.readFileSync(ACCOUNT_ORDERS_PATH, 'utf8');
const wholesaleOrderContent = fs.readFileSync(WHOLESALE_ORDER_PATH, 'utf8');
const hooksContent = fs.readFileSync(HOOKS_PATH, 'utf8');

test('Wholesale Tracking page exists', () => {
  assert.strictEqual(fs.existsSync(PAGE_PATH), true, 'WholesaleTracking.tsx should exist');
});

test('App.tsx contains route', () => {
  assert.ok(appContent.includes('/wholesale/tracking'), 'App.tsx should contain the /wholesale/tracking route');
});

test('use-account hooks for wholesale tracking exist and preference payload is correct', () => {
  assert.ok(hooksContent.includes('useWholesaleTracking'), 'useWholesaleTracking hook should exist');
  assert.ok(hooksContent.includes('useUpdateWholesaleTrackingPrefs'), 'useUpdateWholesaleTrackingPrefs hook should exist');
  assert.ok(hooksContent.includes('wholesale_tracking: enabled'), 'Preference payload must map to wholesale_tracking');
});

test('No account.isWholesale gate in WholesaleTracking.tsx', () => {
  assert.strictEqual(
    pageContent.includes('!account.isWholesale'),
    false,
    'account.isWholesale gate must be removed so any authenticated owner can view historical direct wholesale tracking'
  );
});

test('Accessible switch in WholesaleTracking.tsx', () => {
  assert.ok(pageContent.includes('role="switch"'), 'Must have role="switch"');
  assert.ok(pageContent.includes('aria-checked='), 'Must have aria-checked');
  assert.match(pageContent, /aria-label="[^"]*Wholesale tracking alerts[^"]*"/i, 'Must have an accessible name containing Wholesale tracking alerts');
});

test('Visible explanatory copy for alerts', () => {
  assert.match(pageContent, /in-app feed/i, 'Must mention in-app feed');
  assert.match(pageContent, /Telegram/i, 'Must mention Telegram');
  assert.match(pageContent, /Discord/i, 'Must mention Discord');
});

test('Filter logic classifies null/pending as In transit', () => {
  // Extract the filter logic or verify strings
  // "In transit" should include null/undefined trackingStatus
  // It shouldn't just check o.trackingStatus && ...
  assert.match(pageContent, /if \(filter === "In transit"\) return !isAttentionNeeded\(o\.trackingStatus\) && o\.trackingStatus\?\.toLowerCase\(\) !== "delivered";/i, 'Filter logic for In transit should include null/pending tracking statuses');
});

test('My Orders entry is generally visible and clearly labelled', () => {
  // Enforce structural placement outside the orders.length > 0 block
  assert.ok(
    accountOrdersContent.includes('export function DirectWholesaleTrackingLink'),
    'Link should be extracted to a dedicated component to enforce independent visibility'
  );
  assert.ok(
    accountOrdersContent.includes('<DirectWholesaleTrackingLink />'),
    'The tracking link component must be rendered'
  );
  
  // It shouldn't be inside orderFilter === "wholesale"
  assert.strictEqual(
    accountOrdersContent.includes('orderFilter === "wholesale" && ('),
    false,
    'Should not conditionally render the tracking link based on orderFilter === "wholesale"'
  );
  assert.match(
    accountOrdersContent,
    /Direct Wholesale Tracking/i,
    'Must be clearly labelled as Direct Wholesale Tracking'
  );
  assert.ok(accountOrdersContent.includes('"/wholesale/tracking"'), 'Must link to /wholesale/tracking');
});

test('WholesaleOrder entry link exists', () => {
  assert.ok(wholesaleOrderContent.includes('"/wholesale/tracking"'), 'WholesaleOrder must contain a link to /wholesale/tracking');
});

test('WholesaleOrder deliveryMethodId reversion', () => {
  assert.match(
    wholesaleOrderContent,
    /deliveryMethodId:\s*null/,
    'deliveryMethodId must be exactly null, not an empty string'
  );
});

test('Tracking links and order-details modal trigger', () => {
  assert.ok(pageContent.includes('t.17track.net/en#nums='), 'Must contain 17Track link');
  assert.ok(pageContent.includes('OrderDetailsDialog'), 'Order details must open in a modal');
  assert.ok(pageContent.includes('useAccountOrderDetail'), 'Modal must load the account order-detail endpoint on demand');
  assert.ok(pageContent.includes('Previous updates'), 'Each parcel history must be expandable');
  assert.ok(pageContent.includes('aria-expanded={showPrevious}'), 'History control must expose expansion state');
});

test('Every parcel renders an accessible Previous updates control', () => {
  assert.ok(pageContent.includes('disabled={olderEvents.length === 0}'), 'No-history parcel controls must be disabled');
  assert.ok(pageContent.includes('Previous updates ({olderEvents.length})'), 'Control must visibly show the prior-event count');
  assert.ok(pageContent.includes('aria-controls={olderEvents.length > 0 ? historyId : undefined}'), 'Only controls with a history region may identify it');
  assert.ok(pageContent.includes('<div id={historyId} hidden={!showPrevious}'), 'History region must remain mounted while collapsed');
});

test('Filter labels present', () => {
  assert.ok(pageContent.includes('"All"'), 'Filter All must exist');
  assert.ok(pageContent.includes('"In transit"'), 'Filter In transit must exist');
  assert.ok(pageContent.includes('"Attention needed"'), 'Filter Attention needed must exist');
  assert.ok(pageContent.includes('"Delivered"'), 'Filter Delivered must exist');
});

test('Direct wholesale wording', () => {
  assert.match(pageContent, /Direct Wholesale/i, 'Must explicitly mention Direct Wholesale');
});

test('Loading, error, no-orders, filtered-empty states present', () => {
  assert.ok(pageContent.includes('Loader2'), 'Must handle loading state');
  assert.match(pageContent, /Failed to load|error/i, 'Must handle error state');
  assert.match(pageContent, /No active shipments|No shipments/i, 'Must handle empty state');
  assert.match(pageContent, /match this filter/i, 'Must handle filtered-empty state');
});
