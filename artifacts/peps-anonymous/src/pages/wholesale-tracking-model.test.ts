import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestTrackingEvent, formatSafeDateTime, formatSafeTimeAgo, normalizeTrackingParcels, formatOrderMoney, resolveOrderCurrency, trackingHistoryId } from './wholesale-tracking-model.ts';

test('getLatestTrackingEvent', async (t) => {
  await t.test('returns undefined for empty array', () => {
    assert.strictEqual(getLatestTrackingEvent([]), undefined);
    assert.strictEqual(getLatestTrackingEvent(undefined), undefined);
  });

  await t.test('ignores events with invalid dates', () => {
    const events = [
      { date: 'invalid', status: 'A', location: 'X' },
      { date: '', status: 'B', location: 'Y' }
    ];
    assert.strictEqual(getLatestTrackingEvent(events), undefined);
  });

  await t.test('sorts unsorted events and returns the newest', () => {
    const events = [
      { date: '2023-01-01T10:00:00Z', status: 'Old', location: 'X' },
      { date: '2023-01-03T10:00:00Z', status: 'Newest', location: 'Y' },
      { date: 'invalid', status: 'Bad', location: 'Z' },
      { date: '2023-01-02T10:00:00Z', status: 'Middle', location: 'W' },
    ];
    const latest = getLatestTrackingEvent(events);
    assert.ok(latest);
    assert.strictEqual(latest.status, 'Newest');
  });
});

test('formatSafeDateTime', async (t) => {
  await t.test('returns null for empty or invalid dates', () => {
    assert.strictEqual(formatSafeDateTime(null), null);
    assert.strictEqual(formatSafeDateTime(undefined), null);
    assert.strictEqual(formatSafeDateTime(''), null);
    assert.strictEqual(formatSafeDateTime('not a date'), null);
  });

  await t.test('formats valid dates', () => {
    const str = formatSafeDateTime('2023-01-01T10:00:00Z');
    assert.ok(str);
    assert.ok(str.includes('Jan 1'));
  });
});

test('formatSafeTimeAgo', async (t) => {
  await t.test('returns null for empty or invalid dates', () => {
    assert.strictEqual(formatSafeTimeAgo(null), null);
    assert.strictEqual(formatSafeTimeAgo(undefined), null);
    assert.strictEqual(formatSafeTimeAgo('invalid'), null);
  });

  await t.test('formats valid dates successfully', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5);
    const str = formatSafeTimeAgo(now.toISOString());
    assert.strictEqual(str, '5m ago');
  });
});

test('normalizeTrackingParcels falls back to legacy history only for the first parcel', () => {
  assert.deepEqual(normalizeTrackingParcels({
    trackingNumbers: ['FIRST', 'SECOND'],
    trackingStatus: 'in_transit',
    trackingEvents: [{ date: '2026-01-01T00:00:00Z', status: 'Departed', location: 'Origin' }],
    trackingLastChecked: '2026-01-01T01:00:00Z',
  }), [
    {
      trackingNumber: 'FIRST', status: 'in_transit',
      events: [{ date: '2026-01-01T00:00:00Z', status: 'Departed', location: 'Origin' }],
      lastChecked: '2026-01-01T01:00:00Z',
    },
    { trackingNumber: 'SECOND', status: null, events: [], lastChecked: null },
  ]);
});

test('formatOrderMoney uses valid currency and never renders nonfinite amounts', () => {
  assert.match(formatOrderMoney(12.5, 'USD'), /\$12\.50/);
  assert.strictEqual(formatOrderMoney(Number.NaN, 'not-valid'), 'Unavailable');
});

test('resolveOrderCurrency treats direct and shared wholesale prices as USD', () => {
  assert.strictEqual(resolveOrderCurrency(null, 'wholesale'), 'USD');
  assert.strictEqual(resolveOrderCurrency(null, 'wholesale_shared'), 'USD');
  assert.strictEqual(resolveOrderCurrency('EUR', 'wholesale'), 'EUR');
  assert.strictEqual(resolveOrderCurrency(null, null), 'GBP');
});

test('trackingHistoryId is unique per order for the same tracking number', () => {
  assert.notStrictEqual(trackingHistoryId('order-one', 'SAME/NUMBER'), trackingHistoryId('order-two', 'SAME/NUMBER'));
});

test('trackingHistoryId is collision-proof for distinct tracking values on one order', () => {
  assert.notStrictEqual(trackingHistoryId('order-one', 'AB/12'), trackingHistoryId('order-one', 'AB?12'));
});