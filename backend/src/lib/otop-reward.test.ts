import assert from 'node:assert/strict';
import test from 'node:test';

import { collectedDistrictCount, requiredDistrictStamps } from './otop-reward';

test('80 percent threshold rounds up to whole distinct districts', () => {
  assert.equal(requiredDistrictStamps(10), 8);
  assert.equal(requiredDistrictStamps(11), 9);
  const stamps = [1201, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208]
    .map(District_ID => ({ district_stamps: { District_ID, districts: { Prov_ID: 12 } } }));
  stamps.push({ district_stamps: { District_ID: 5001, districts: { Prov_ID: 50 } } });
  assert.equal(collectedDistrictCount(stamps, 12), 8);
});
