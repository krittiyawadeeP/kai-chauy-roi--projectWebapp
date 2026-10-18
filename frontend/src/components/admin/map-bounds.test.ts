import assert from 'node:assert/strict';
import test from 'node:test';
import { merchantBounds } from './map-bounds';

test('merchant extent uses actual coordinates even when a shop is outside its registered province', () => {
  const shops = [{ lat: 18.7883, lng: 98.9853 }, { lat: 13.8475, lng: 100.4932 }];
  assert.deepEqual(merchantBounds(shops), [[13.8475, 98.9853], [18.7883, 100.4932]]);
  assert.deepEqual(merchantBounds([shops[1]]), [[13.8475, 100.4932], [13.8475, 100.4932]]);
  assert.equal(merchantBounds([]), null);
  assert.deepEqual(shops[0], { lat: 18.7883, lng: 98.9853 });
});
