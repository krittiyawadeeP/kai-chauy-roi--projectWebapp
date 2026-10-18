import assert from 'node:assert/strict';
import test from 'node:test';
import { mapApiMerchant, getCoordinates, type ApiMerchant } from './merchantService';

const shop: ApiMerchant = {
  Mch_ID: 4, User_ID: 4, Shop_Name: 'Shop', Category: null, Dist_ID: 1,
  Lat: null, Lng: null,
};

test('shops without a complete valid coordinate pair remain unlocated instead of defaulting to Nonthaburi', () => {
  for (const coordinates of [
    { Lat: null, Lng: null },
    { Lat: '18.7903', Lng: null },
    { Lat: null, Lng: '98.9972' },
    { Lat: 'invalid', Lng: '98.9972' },
    { Lat: 91, Lng: 181 },
  ]) {
    const mapped = mapApiMerchant({ ...shop, ...coordinates });
    assert.equal(mapped.lat, null);
    assert.equal(mapped.lng, null);
    assert.equal(getCoordinates(mapped.lat, mapped.lng), null);
  }
});

test('actual database coordinates keep their latitude/longitude order, including zero', () => {
  const mapped = mapApiMerchant({ ...shop, Lat: '18.790300', Lng: '98.997200' });
  assert.equal(mapped.lat, 18.7903);
  assert.equal(mapped.lng, 98.9972);
  assert.deepEqual(getCoordinates(mapped.lat, mapped.lng), [18.7903, 98.9972]);
  const zero = mapApiMerchant({ ...shop, Lat: 0, Lng: 0 });
  assert.equal(zero.lat, 0);
  assert.equal(zero.lng, 0);
  assert.deepEqual(getCoordinates(0, 0), [0, 0]);
  assert.deepEqual(getCoordinates(-90, -180), [-90, -180]);
  assert.deepEqual(getCoordinates(90, 180), [90, 180]);
  assert.equal(getCoordinates(Infinity, 100), null);
  assert.equal(getCoordinates(13, NaN), null);
});
