import assert from 'node:assert/strict';
import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';
import { requiredDistrictStamps } from '../src/lib/otop-reward';
import { PROVINCES } from '../../shared/geography';
import { findProvince } from '../../shared/regions';

// Classroom reward catalog: one provincial product idea per province.
const names: Record<string, string> = {
  '10': 'ชุดของขวัญขนมไทยเจ้าพระยา',
  '11': 'ปลาสลิดบางบ่ออบกรอบ',
  '12': 'ทุเรียนก้านยาวนนท์แปรรูป',
  '13': 'ข้าวหอมปทุมธานีบรรจุถุง',
  '14': 'โรตีสายไหมอยุธยา',
  '15': 'ตุ๊กตาชาววังอ่างทอง',
  '16': 'เมล็ดทานตะวันอบกรอบลพบุรี',
  '17': 'ปลาช่อนแดดเดียวสิงห์บุรี',
  '18': 'ส้มโอขาวแตงกวาชัยนาท',
  '19': 'กะหรี่ปั๊บสระบุรี',
  '20': 'ข้าวหลามหนองมน',
  '21': 'ทุเรียนทอดระยอง',
  '22': 'พริกไทยจันทบุรีบรรจุขวด',
  '23': 'หมวกงอบใบจากตราด',
  '24': 'มะม่วงน้ำดอกไม้แปรรูปแปดริ้ว',
  '25': 'ชุดสมุนไพรปราจีนบุรี',
  '26': 'มะยงชิดอบแห้งนครนายก',
  '27': 'ผ้าทอลายสระแก้ว',
  '30': 'เครื่องปั้นดินเผาด่านเกวียน',
  '31': 'ผ้าฝ้ายทอลายบุรีรัมย์',
  '32': 'ผ้าไหมสุรินทร์',
  '33': 'หอมแดงศรีสะเกษอบแห้ง',
  '34': 'ผ้าทอลายกาบบัวอุบล',
  '35': 'หมอนขิดยโสธร',
  '36': 'ผ้าไหมมัดหมี่ชัยภูมิ',
  '37': 'ข้าวหอมมะลิอำนาจเจริญ',
  '38': 'ปลานิลแดดเดียวบึงกาฬ',
  '39': 'ผ้าทอหนองบัวลำภู',
  '40': 'ผ้าไหมมัดหมี่ขอนแก่น',
  '41': 'เครื่องปั้นดินเผาบ้านเชียง',
  '42': 'มะพร้าวแก้วเชียงคาน',
  '43': 'ผ้าฝ้ายทอมือหนองคาย',
  '44': 'เสื่อกกมหาสารคาม',
  '45': 'ข้าวหอมมะลิทุ่งกุลา',
  '46': 'ผ้าไหมแพรวากาฬสินธุ์',
  '47': 'ผ้าย้อมครามสกลนคร',
  '48': 'ผ้าทอพื้นเมืองนครพนม',
  '49': 'ผ้าฝ้ายทอมือมุกดาหาร',
  '50': 'ร่มกระดาษสาบ่อสร้าง',
  '51': 'ผ้ายกดอกลำพูน',
  '52': 'ชามเซรามิกลายไก่ลำปาง',
  '53': 'ทุเรียนหลงลับแลอบกรอบ',
  '54': 'ผ้าหม้อห้อมแพร่',
  '55': 'เกลือภูเขาบ่อเกลือ',
  '56': 'ผ้าทอพื้นเมืองพะเยา',
  '57': 'ชาเชียงรายบรรจุกระป๋อง',
  '58': 'ผ้าทอพื้นเมืองแม่ฮ่องสอน',
  '60': 'โมจินครสวรรค์',
  '61': 'ปลาแรดแดดเดียวอุทัยธานี',
  '62': 'กล้วยไข่อบกรอบกำแพงเพชร',
  '63': 'กาแฟดอยมูเซอตาก',
  '64': 'ผ้าทอลายสุโขทัย',
  '65': 'กล้วยตากบางกระทุ่ม',
  '66': 'ข้าวแต๋นพิจิตร',
  '67': 'มะขามหวานเพชรบูรณ์',
  '70': 'โอ่งมังกรราชบุรี',
  '71': 'ข้าวเกรียบเห็ดกาญจนบุรี',
  '72': 'ขนมสาลี่สุพรรณบุรี',
  '73': 'ส้มโอนครชัยศรีอบแห้ง',
  '74': 'อาหารทะเลแปรรูปสมุทรสาคร',
  '75': 'น้ำตาลมะพร้าวอัมพวา',
  '76': 'ขนมหม้อแกงเพชรบุรี',
  '77': 'สับปะรดปราณบุรีอบแห้ง',
  '80': 'เครื่องถมเมืองนคร',
  '81': 'ผ้าบาติกกระบี่',
  '82': 'กะปิพังงาบรรจุกระปุก',
  '83': 'เครื่องประดับมุกภูเก็ต',
  '84': 'ไข่เค็มไชยา',
  '85': 'เม็ดมะม่วงหิมพานต์อบระนอง',
  '86': 'กาแฟคั่วชุมพร',
  '90': 'ปลาแดดเดียวสงขลา',
  '91': 'ผ้าบาติกสตูล',
  '92': 'หมูย่างเมืองตรัง',
  '93': 'เสื่อกระจูดพัทลุง',
  '94': 'ผ้าบาติกปัตตานี',
  '95': 'กล้วยหินยะลาอบกรอบ',
  '96': 'ข้าวเกรียบปลานราธิวาส',
};

assert.equal(Object.keys(names).length, 77);
assert(PROVINCES.every(province => names[province.code]));

const prisma = new PrismaClient();
try {
  const provinces = await prisma.provinces.findMany({ include: { _count: { select: { districts: true } } } });
  assert.equal(provinces.length, 77, 'Expected 77 provinces in the database');
  const existing = await prisma.rewards.findMany({ where: { Reward_Type: 'OTOP_PRODUCT', Province_ID: { not: null } }, select: { Province_ID: true } });
  const occupied = new Set(existing.map(reward => reward.Province_ID));
  const classroomDrafts = await prisma.rewards.count({ where: {
    Reward_Type: 'OTOP_PRODUCT', Status: 'INACTIVE', Source_URL: null,
    Description: { startsWith: 'แนวคิดสินค้าเด่นจังหวัด' }, Reward_Name: { in: Object.values(names) },
  } });
  const additions = provinces.filter(province => !occupied.has(province.Prov_ID)).map(province => {
    const code = findProvince(province.Prov_Name)?.code;
    assert(code && names[code], `Unknown province: ${province.Prov_Name}`);
    assert(province._count.districts > 0, `No districts in ${province.Prov_Name}`);
    return {
      Reward_Name: names[code], Reward_Type: 'OTOP_PRODUCT', Province_ID: province.Prov_ID,
      Description: `สินค้าเด่นประจำจังหวัด${province.Prov_Name} สำหรับแลกด้วยแสตมป์`,
      Required_Stamp_Count: requiredDistrictStamps(province._count.districts),
      Status: 'ACTIVE', Image_URL: null, Source_URL: null,
    };
  });
  if (process.argv.includes('--dry-run')) console.log(JSON.stringify({ provinces: provinces.length, existing: occupied.size, toAdd: additions.length, toActivate: classroomDrafts, names: additions.map(item => item.Reward_Name) }, null, 2));
  else {
    const result = await prisma.rewards.createMany({ data: additions });
    const activated = await prisma.rewards.updateMany({
      where: {
        Reward_Type: 'OTOP_PRODUCT', Status: 'INACTIVE', Source_URL: null,
        Description: { startsWith: 'แนวคิดสินค้าเด่นจังหวัด' }, Reward_Name: { in: Object.values(names) },
      },
      data: { Status: 'ACTIVE', Description: 'สินค้าเด่นประจำจังหวัดสำหรับแลกด้วยแสตมป์' },
    });
    console.log(JSON.stringify({ provinces: provinces.length, existing: occupied.size, created: result.count, activated: activated.count }));
  }
} finally {
  await prisma.$disconnect();
}
