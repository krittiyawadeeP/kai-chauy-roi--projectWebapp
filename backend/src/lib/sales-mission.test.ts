import assert from 'node:assert/strict';
import test from 'node:test';
import { bangkokDate, eligibleMissionSlots, summarizeSales, suggestMission } from './sales-mission';

test('daily analysis dates follow Bangkok midnight', () => {
  assert.equal(bangkokDate(new Date('2026-10-22T16:59:59Z')), '2026-10-22');
  assert.equal(bangkokDate(new Date('2026-10-22T17:00:00Z')), '2026-10-23');
});

test('groups completed sales into Bangkok two-hour weekday and weekend slots', () => {
  const summary = summarizeSales([
    { Tx_Timestamp: new Date('2026-10-19T02:15:00Z'), Total_Amount: { toString: () => '200' } },
    { Tx_Timestamp: new Date('2026-10-20T02:45:00Z'), Total_Amount: { toString: () => '300' } },
    { Tx_Timestamp: new Date('2026-10-18T02:15:00Z'), Total_Amount: { toString: () => '400' } },
  ]);
  assert.equal(summary.daysWithSales, 3);
  assert.equal(summary.observedOpeningTime, '09:15');
  assert.equal(summary.observedClosingTime, '09:45');
  assert.deepEqual(summary.slots.map(slot => [slot.dayType, slot.startHour, slot.daysWithSales, slot.totalRevenue]), [
    ['weekday', 8, 2, 500], ['weekend', 8, 1, 400],
  ]);
});

test('opening and closing estimates use bill times across the analysis period regardless of input order', () => {
  const summary = summarizeSales([
    { Tx_Timestamp: new Date('2026-10-20T14:50:00Z'), Total_Amount: { toString: () => '100' } },
    { Tx_Timestamp: new Date('2026-10-21T01:05:00Z'), Total_Amount: { toString: () => '100' } },
    { Tx_Timestamp: new Date('2026-10-19T03:00:00Z'), Total_Amount: { toString: () => '100' } },
  ]);
  assert.equal(summary.observedOpeningTime, '08:05');
  assert.equal(summary.observedClosingTime, '21:50');
  assert.equal(summarizeSales([]).observedOpeningTime, null);
  assert.equal(summarizeSales([]).observedClosingTime, null);
});

test('only sends fully contained sales slots and rejects a suggestion past the last bill', async () => {
  const summary = summarizeSales([
    { Tx_Timestamp: new Date('2026-10-19T01:24:00Z'), Total_Amount: { toString: () => '200' } },
    { Tx_Timestamp: new Date('2026-10-20T05:15:00Z'), Total_Amount: { toString: () => '300' } },
    { Tx_Timestamp: new Date('2026-10-21T09:25:00Z'), Total_Amount: { toString: () => '400' } },
  ]);
  assert.deepEqual(eligibleMissionSlots(summary).map(slot => slot.startHour), [12]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const request = JSON.parse(String(options?.body));
    assert.equal(request.model, 'qwen3:4b');
    assert.equal(request.stream, false);
    assert.equal(request.format.type, 'object');
    assert.match(request.messages[0].content, /"startHour":12/);
    assert.doesNotMatch(request.messages[0].content, /"startHour":16/);
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ dayType: 'weekday', startHour: 16, endHour: 18, reason: 'test', missionName: 'test', description: 'test' }) } }), { status: 200 });
  };
  try {
    await assert.rejects(suggestMission('Shop', null, summary), /outside the eligible sales slots/);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(eligibleMissionSlots(summarizeSales([{
    Tx_Timestamp: new Date('2026-10-19T01:24:00Z'), Total_Amount: { toString: () => '200' },
  }])), []);
});

test('daily mission prompt compares only slots from the selected Bangkok day', async () => {
  const summary = summarizeSales([
    ...[1, 3, 5, 7, 9].map((hour, index) => ({
      Tx_Timestamp: new Date(`2026-10-22T${String(hour).padStart(2, '0')}:${index === 0 ? '24' : index === 4 ? '25' : '15'}:00Z`),
      Total_Amount: { toString: () => '100' },
    })),
  ]);
  assert.deepEqual(eligibleMissionSlots(summary).map(slot => slot.startHour), [10, 12, 14]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const prompt = JSON.parse(String(options?.body)).messages[0].content as string;
    assert.match(prompt, /"analysisDate":"2026-10-22"/);
    assert.match(prompt, /"periodDays":1/);
    assert.match(prompt, /compare slots only within that day/);
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ dayType: 'weekday', startHour: 12, endHour: 14, reason: 'test', missionName: 'test', description: 'test' }) } }), { status: 200 });
  };
  try {
    assert.equal((await suggestMission('Shop', null, summary, '2026-10-22')).startHour, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('daily AI cannot select a higher-average eligible sales slot', async () => {
  const summary = summarizeSales([8, 10, 12, 16].map(hour => ({
    Tx_Timestamp: new Date(`2026-10-22T${String(hour).padStart(2, '0')}:00:00+07:00`),
    Total_Amount: hour === 10 ? 20 : 200,
  })));
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: { content: JSON.stringify({ dayType: 'weekday', startHour: 12, endHour: 14, reason: 'Low sales', missionName: 'Mission', description: 'Visit' }) } });
    await assert.rejects(suggestMission('Shop', null, summary), /lowest-average sales slot/);
    globalThis.fetch = async () => Response.json({ message: { content: JSON.stringify({ dayType: 'weekday', startHour: 10, endHour: 12, reason: 'Lowest average 20', missionName: 'Mission', description: 'Visit' }) } });
    assert.equal((await suggestMission('Shop', null, summary)).startHour, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
