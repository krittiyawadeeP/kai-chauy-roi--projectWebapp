import assert from 'node:assert/strict';
import test from 'node:test';
import { completedBangkokDay, millisecondsUntilBangkokMidnight, nextMissionWindow, pickDailyMerchant } from './daily-mission-job';

test('scheduled job analyzes the completed Bangkok day at midnight', () => {
  const before = new Date('2026-10-22T16:59:59Z');
  assert.equal(completedBangkokDay(before).date, '2026-10-21');
  assert.equal(millisecondsUntilBangkokMidnight(before), 1000);
  const after = new Date('2026-10-22T17:00:00Z');
  assert.equal(completedBangkokDay(after).date, '2026-10-22');
  assert.equal(completedBangkokDay(after).analysisDate.toISOString(), '2026-10-22T00:00:00.000Z');
  assert.equal(completedBangkokDay(after).start.toISOString(), '2026-10-21T17:00:00.000Z');
  assert.equal(millisecondsUntilBangkokMidnight(after), 86_400_000);
});

test('merchant selection is stable for a province and date', () => {
  const candidates = [11, 12, 13, 14];
  const first = pickDailyMerchant(candidates, '2026-10-22', 73);
  assert.equal(pickDailyMerchant(candidates, '2026-10-22', 73), first);
  assert.ok(candidates.includes(first));
});

test('automatic mission starts on the next matching Bangkok day', () => {
  const now = new Date('2026-10-22T17:00:00Z'); // Friday 00:00 in Bangkok
  const base = { startHour: 14, endHour: 16, reason: 'test', missionName: 'test', description: 'test' };
  assert.equal(nextMissionWindow({ ...base, dayType: 'weekday' }, now).start.toISOString(), '2026-10-26T07:00:00.000Z');
  const weekend = nextMissionWindow({ ...base, dayType: 'weekend' }, now);
  assert.equal(weekend.start.toISOString(), '2026-10-24T07:00:00.000Z');
  assert.equal(weekend.end.toISOString(), '2026-10-24T09:00:00.000Z');
});
