import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';
import { findProvince } from '../../shared/regions';

// Commons photos illustrate the product type. The classroom reward names are not registered products.
const queries: Record<string, string> = {
  '10': 'Thai dessert', '11': 'dried fish', '12': 'durian chips', '13': 'jasmine rice',
  '14': 'roti sai mai', '15': 'Thai doll', '16': 'sunflower seeds', '17': 'dried fish',
  '18': 'pomelo fruit', '19': 'curry puff', '20': 'khao lam', '21': 'durian chips',
  '22': 'black peppercorns', '23': 'straw conical hat', '24': 'dried mango slices', '25': 'Thai herbal products',
  '26': 'marian plum', '27': 'Thai textile', '30': 'Dan Kwian pottery', '31': 'cotton weaving',
  '32': 'Thai silk', '33': 'shallot', '34': 'Thai textile', '35': 'pillow',
  '36': 'Thai silk', '37': 'jasmine rice', '38': 'dried fish', '39': 'cotton weaving',
  '40': 'Thai silk', '41': 'Ban Chiang pottery', '42': 'coconut candy', '43': 'cotton weaving',
  '44': 'woven mat', '45': 'jasmine rice', '46': 'Thai silk', '47': 'indigo cloth',
  '48': 'Thai textile', '49': 'cotton weaving', '50': 'paper umbrella', '51': 'Thai silk',
  '52': 'rooster bowl', '53': 'durian chips', '54': 'indigo cloth', '55': 'rock salt',
  '56': 'Thai textile', '57': 'Thai iced tea', '58': 'Thai textile', '60': 'mochi',
  '61': 'dried fish', '62': 'banana chips', '63': 'coffee beans', '64': 'Thai textile',
  '65': 'dried bananas', '66': 'khao tan', '67': 'tamarind', '70': 'Ratchaburi pottery',
  '71': 'mushroom crisps', '72': 'sali cake', '73': 'pomelo fruit', '74': 'dried seafood',
  '75': 'coconut sugar', '76': 'custard dessert', '77': 'pineapple fruit', '80': 'niello silver',
  '81': 'batik', '82': 'shrimp paste', '83': 'pearl bracelet', '84': 'salted eggs',
  '85': 'cashew nuts', '86': 'coffee beans', '90': 'dried fish', '91': 'batik',
  '92': 'roasted pork', '93': 'woven mat', '94': 'batik', '95': 'banana chips', '96': 'fish crackers',
};
assert.equal(Object.keys(queries).length, 77);

// Exact Commons files reviewed for products where text search returned unrelated subjects.
const fixedTitles: Record<string, string> = {
  'khao tan': 'File:DFC 5518 Crispy rice cakes frying in hot oil - a popular crunchy snack being prepared at a local market in Sattahip Chon Buri.jpg',
  'Ratchaburi pottery': 'File:Ratchaburi Musuem - 2017-04-16 (071).jpg',
  'niello silver': 'File:Earrings, pair (AM 2003.73.5).jpg',
  'pearl bracelet': 'File:Pearl bracelet.JPG',
  'rooster bowl': 'File:Bowl LACMA M.84.213.107.jpg',
  'mushroom crisps': 'File:Crackers Food.jpg',
  pillow: 'File:Hand made pillow.jpg',
};

const fallbackQueries: Record<string, string[]> = {
  'banana chips': ['banana crisps', 'banana'],
  'durian chips': ['dried durian', 'durian fruit'],
  'Thai cushion': ['Thai pillow', 'cushion'],
  'Ban Chiang pottery': ['Ban Chiang', 'Thai pottery'],
  'paper umbrella': ['Thai parasol', 'parasol'],
  'rooster bowl': ['ceramic rooster bowl', 'ceramic bowl'],
  'indigo cloth': ['indigo textile', 'indigo dyed fabric'],
  'mushroom crisps': ['mushroom snack', 'mushroom'],
  'sali cake': ['sponge cake', 'cake'],
  'custard dessert': ['custard', 'khanom mo kaeng'],
  'niello silver': ['niello', 'silverware'],
  'woven reed mat': ['reed mat', 'woven mat'],
  'Ratchaburi pottery': ['pottery jar', 'earthenware jar'],
  'Thai herbal products': ['herbal products', 'herbs'],
  'Thai iced tea': ['iced Thai tea', 'iced tea'],
  'dried seafood': ['dried fish', 'seafood'],
  'pearl bracelet': ['pearl necklace', 'pearl jewelry'],
  'straw conical hat': ['conical straw hat', 'straw hat'],
  'khao tan': ['Thai rice cracker', 'rice cracker'],
  'roasted pork': ['roast pork', 'pork roast'],
};

type CommonsPage = { index?: number; title: string; imageinfo?: { mime: string; width: number; height: number; thumburl?: string; url: string; descriptionurl: string; extmetadata?: { LicenseShortName?: { value: string }; Artist?: { value: string } } }[] };
type Image = { title: string; url: string; source: string; license: string; artist: string };
const manifestUrl = new URL('./otop-image-manifest.json', import.meta.url);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function search(query: string): Promise<Image | null> {
  const params = new URLSearchParams({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '640', format: 'json' });
  if (fixedTitles[query]) params.set('titles', fixedTitles[query]);
  else {
    params.set('generator', 'search'); params.set('gsrsearch', `intitle:"${query}" filetype:bitmap`);
    params.set('gsrnamespace', '6'); params.set('gsrlimit', '12');
  }
  let response: Response;
  for (let attempt = 0; ; attempt++) {
    response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': 'ClassProject/1.0 (OTOP reward image lookup)' }, signal: AbortSignal.timeout(15000) });
    if (response.status !== 429 || attempt === 4) break;
    await sleep(3000 * (attempt + 1));
  }
  if (!response.ok) throw new Error(`Commons HTTP ${response.status} for ${query}`);
  const data = await response.json() as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const chosen = pages.find(page => {
    const info = page.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value ?? '';
    return info && ['image/jpeg', 'image/png', 'image/webp'].includes(info.mime) && info.width >= 300 && info.height >= 250 &&
      /^(CC0|CC BY|Public domain)/i.test(license) && !/\.pdf|map of|satellite|logo/i.test(page.title);
  });
  if (!chosen) return null;
  const info = chosen.imageinfo![0];
  return {
    title: chosen.title,
    url: (info.thumburl ?? info.url).split('?')[0],
    source: info.descriptionurl,
    license: info.extmetadata?.LicenseShortName?.value ?? '',
    artist: (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').slice(0, 180),
  };
}

const prisma = new PrismaClient();
try {
  const rewards = await prisma.rewards.findMany({ where: { Reward_Type: 'OTOP_PRODUCT', Province_ID: { not: null } }, include: { provinces: true } });
  assert.equal(rewards.length, 77);
  const uniqueQueries = [...new Set(Object.values(queries))];
  const previous = existsSync(manifestUrl) ? JSON.parse(readFileSync(manifestUrl, 'utf8')) as { query: string; image: Image | null }[] : [];
  const found = new Map<string, Image | null>(previous.filter(item => item.image && (!fixedTitles[item.query] || item.image.title === fixedTitles[item.query])).map(item => [item.query, item.image]));
  for (const query of uniqueQueries) {
    if (found.has(query)) continue;
    try {
      let image: Image | null = null;
      for (const term of [query, ...(fallbackQueries[query] ?? [])]) {
        image = await search(term);
        if (image) break;
        await sleep(1800);
      }
      found.set(query, image);
    }
    catch (error) { console.error(`Search failed for ${query}: ${String(error)}`); found.set(query, null); }
    console.log(`Searched ${uniqueQueries.indexOf(query) + 1}/${uniqueQueries.length}: ${query} ${found.get(query) ? 'found' : 'missing'}`);
    await sleep(1800);
  }
  const manifest = rewards.map(reward => {
    const code = findProvince(reward.provinces!.Prov_Name)?.code;
    assert(code && queries[code]);
    return { rewardId: reward.Reward_ID, province: reward.provinces!.Prov_Name, product: reward.Reward_Name, query: queries[code], image: found.get(queries[code]) ?? null };
  }).sort((a, b) => a.province.localeCompare(b.province, 'th'));
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ total: manifest.length, withImage: manifest.filter(item => item.image).length, missing: manifest.filter(item => !item.image).map(item => `${item.province}: ${item.query}`), uniqueImages: new Set(manifest.map(item => item.image?.url).filter(Boolean)).size }));
  if (process.argv.includes('--apply')) {
    assert(manifest.every(item => item.image), 'Refusing partial image update');
    const rewardsById = new Map(rewards.map(reward => [reward.Reward_ID, reward]));
    for (const item of manifest) {
      const original = rewardsById.get(item.rewardId)?.Description?.replace(/\nภาพประกอบ: [^\n]*/g, '') ?? '';
      const credit = `ภาพประกอบ: ${item.image!.artist || 'ดูชื่อผู้สร้างที่ลิงก์ที่มา'} (${item.image!.license}), Wikimedia Commons`;
      await prisma.rewards.update({ where: { Reward_ID: item.rewardId }, data: {
        Image_URL: item.image!.url, Source_URL: item.image!.source,
        Description: `${original}\n${credit}`.trim(),
      } });
    }
    const stored = await prisma.rewards.count({ where: { Reward_Type: 'OTOP_PRODUCT', Province_ID: { not: null }, Image_URL: { not: null }, Source_URL: { not: null } } });
    console.log(`Updated ${manifest.length} rewards; verified ${stored} with image and source`);
  }
} finally {
  await prisma.$disconnect();
}
