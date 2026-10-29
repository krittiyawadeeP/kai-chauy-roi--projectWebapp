import {
  Province,
  District,
  User,
  Merchant,
  SalesTransaction,
  AISalesAnalysis,
  Mission,
  DistrictStamp,
  UserStamp,
  Reward,
  StampRedemption,
  Wallet,
  UserGrant
} from '../types';

export const INITIAL_PROVINCES: Province[] = [
  { provId: 12, provName: 'นนทบุรี' },
  { provId: 10, provName: 'กรุงเทพมหานคร' },
  { provId: 50, provName: 'เชียงใหม่' },
  { provId: 14, provName: 'พระนครศรีอยุธยา' },
];

export const INITIAL_DISTRICTS: District[] = [
  // นนทบุรี
  { distId: 1201, distName: 'เมืองนนทบุรี', provId: 12 },
  { distId: 1206, distName: 'ปากเกร็ด (เกาะเกร็ด)', provId: 12 },
  { distId: 1202, distName: 'บางกรวย', provId: 12 },
  { distId: 1203, distName: 'บางใหญ่', provId: 12 },
  // กรุงเทพมหานคร
  { distId: 1001, distName: 'พระนคร', provId: 10 },
  { distId: 1002, distName: 'ดุสิต', provId: 10 },
  { distId: 1013, distName: 'สัมพันธวงศ์ (เยาวราช)', provId: 10 },
  // เชียงใหม่
  { distId: 5001, distName: 'เมืองเชียงใหม่', provId: 50 },
  { distId: 5007, distName: 'แม่ริม', provId: 50 },
  { distId: 5013, distName: 'สันกำแพง', provId: 50 },
];

export const INITIAL_USERS: User[] = [
  {
    userId: 1,
    citizenId: '1-1037-02948-11-2',
    name: 'นายกิตติคุณ ศรีสวัสดิ์ (ประชาชนทดสอบ)',
    role: 'citizen',
    phone: '081-456-7890',
    provId: 12,
    distId: 1201,
    status: 'approved',
    registeredAt: '2026-10-01 09:30:00'
  },
  {
    userId: 2,
    citizenId: '3-1005-00482-83-1',
    name: 'นายเปี๊ยก มั่นเจริญ (เจ้าของร้านกาแฟโบราณ)',
    role: 'merchant',
    phone: '089-223-4455',
    provId: 12,
    distId: 1201,
    status: 'approved',
    registeredAt: '2026-10-02 11:15:00'
  },
  {
    userId: 3,
    citizenId: '5-1022-09876-12-3',
    name: 'เจ้าหน้าที่สำนักงานส่งเสริมเศรษฐกิจดิจิทัลภาครัฐ (Admin)',
    role: 'admin',
    phone: '02-142-1234',
    provId: 12,
    distId: 1201,
    status: 'approved',
    registeredAt: '2026-09-01 08:00:00'
  }
];

export const INITIAL_MERCHANTS: Merchant[] = [
  {
    mchId: 1,
    userId: 2,
    shopName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    category: 'อาหารและเครื่องดื่ม',
    address: '24/1 ถ.ประชาราษฎร์ ต.สวนใหญ่ อ.เมือง จ.นนทบุรี',
    lat: 13.8475,
    lng: 100.4932,
    distId: 1201,
    provId: 12,
    ownerName: 'นายเปี๊ยก มั่นเจริญ',
    phone: '089-223-4455',
    status: 'approved',
    registeredAt: '2026-10-02 11:15:00',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0892234455',
    dailyAvgSales: 5000,
    currentDailySales: 2500, // Drop 50% highlighted in PDF!
    isAiTarget: true
  },
  {
    mchId: 2,
    userId: 4,
    shopName: 'ป้าสมร ขนมไทยมงคลเกาะเกร็ด',
    category: 'อาหารและเครื่องดื่ม',
    address: 'หมู่ 6 ต.เกาะเกร็ด อ.ปากเกร็ด จ.นนทบุรี',
    lat: 13.9123,
    lng: 100.4908,
    distId: 1206,
    provId: 12,
    ownerName: 'นางสมร สุขสมบูรณ์',
    phone: '084-555-1234',
    status: 'approved',
    registeredAt: '2026-10-03 14:00:00',
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0845551234',
    dailyAvgSales: 4200,
    currentDailySales: 3900,
    isAiTarget: false
  },
  {
    mchId: 3,
    userId: 5,
    shopName: 'เครื่องปั้นดินเผาบ้านมอญ เกาะเกร็ด OTOP',
    category: 'หัตถกรรม/ของฝาก',
    address: '12 ต.เกาะเกร็ด อ.ปากเกร็ด จ.นนทบุรี',
    lat: 13.9145,
    lng: 100.4921,
    distId: 1206,
    provId: 12,
    ownerName: 'นายประสิทธิ์ ศิลปหัตถ์',
    phone: '082-998-7711',
    status: 'approved',
    registeredAt: '2026-10-03 15:30:00',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0829987711',
    dailyAvgSales: 6500,
    currentDailySales: 3100, // Low sales
    isAiTarget: true
  },
  {
    mchId: 4,
    userId: 6,
    shopName: 'สวนทุเรียนเมืองนนท์ ลุงเชวง',
    category: 'ผลไม้/เกษตรแปรรูป',
    address: '88 หมู่ 3 ต.บางกร่าง อ.เมือง จ.นนทบุรี',
    lat: 13.8340,
    lng: 100.4650,
    distId: 1201,
    provId: 12,
    ownerName: 'นายเชวง นนทกานต์',
    phone: '086-123-9988',
    status: 'approved',
    registeredAt: '2026-10-04 10:00:00',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0861239988',
    dailyAvgSales: 8000,
    currentDailySales: 7800,
    isAiTarget: false
  },
  {
    mchId: 5,
    userId: 7,
    shopName: 'ข้าวซอยโบราณยายคำ แม่ริม',
    category: 'อาหารและเครื่องดื่ม',
    address: '45 ถ.โชตนา ต.ริมใต้ อ.แม่ริม จ.เชียงใหม่',
    lat: 18.9145,
    lng: 98.9450,
    distId: 5007,
    provId: 50,
    ownerName: 'นางคำดี นวลจันทร์',
    phone: '083-441-2299',
    status: 'approved',
    registeredAt: '2026-10-05 09:00:00',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0834412299',
    dailyAvgSales: 5500,
    currentDailySales: 2800,
    isAiTarget: true
  },
  {
    mchId: 6,
    userId: 8,
    shopName: 'ร้านสมุนไพรอบแห้งวิสาหกิจชุมชนบางใหญ่',
    category: 'ของใช้ทั่วไป',
    address: '99 หมู่ 2 ต.บางแม่นาง อ.บางใหญ่ จ.นนทบุรี',
    lat: 13.8761,
    lng: 100.4120,
    distId: 1203,
    provId: 12,
    ownerName: 'นางมาลี ชุมชนรักษ์',
    phone: '081-772-3344',
    status: 'pending', // Pending approval!
    registeredAt: '2026-10-12 16:20:00',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    promptpayId: '0817723344',
    dailyAvgSales: 3000,
    currentDailySales: 0,
    isAiTarget: false
  }
];

export const INITIAL_AI_ANALYSIS: AISalesAnalysis[] = [
  {
    analysisId: 1,
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    salesAmount: 2500,
    averageSales: 5000,
    salesRatio: 0.50,
    salesStatus: 'critical_low',
    boostRecommended: true,
    analyzedAt: '2026-10-13 08:00:00',
    criticalHours: '13:00 - 16:00 น.',
    aiInsight: 'ตรวจพบยอดขายลดลง 50% ติดต่อกัน 7 วัน โดยเฉพาะช่วงบ่าย 13:00-16:00 น. ยอดตกลงมากที่สุด',
    suggestedAction: 'สร้าง General Mission กระตุ้นการซื้อขั้นต่ำ 150 บาท รับแสตมป์ของดีเมืองนนท์ จำกัด 10 สิทธิ์แรก'
  },
  {
    analysisId: 2,
    merchantId: 3,
    merchantName: 'เครื่องปั้นดินเผาบ้านมอญ เกาะเกร็ด OTOP',
    salesAmount: 3100,
    averageSales: 6500,
    salesRatio: 0.47,
    salesStatus: 'critical_low',
    boostRecommended: true,
    analyzedAt: '2026-10-13 08:00:00',
    criticalHours: '11:00 - 14:00 น.',
    aiInsight: 'นักท่องเที่ยววันธรรมดาลดลง ยอดขายสินค้าหัตถกรรมชะลอตัวลง 52%',
    suggestedAction: 'แนะนำภารกิจอุดหนุนของดีชุมชนเกาะเกร็ด แลกรับแสตมป์มนต์เสน่ห์เกาะเกร็ด'
  },
  {
    analysisId: 3,
    merchantId: 5,
    merchantName: 'ข้าวซอยโบราณยายคำ แม่ริม',
    salesAmount: 2800,
    averageSales: 5500,
    salesRatio: 0.51,
    salesStatus: 'low',
    boostRecommended: true,
    analyzedAt: '2026-10-13 08:00:00',
    criticalHours: '14:00 - 17:00 น.',
    aiInsight: 'ลูกค้าน้อยลงหลังช่วงพักเที่ยง แนะนำจัดกิจกรรมสะสมแต้มช่วงบ่าย',
    suggestedAction: 'สร้างภารกิจซื้ออาหารพื้นเมืองครบ 150 บาท'
  },
  {
    analysisId: 4,
    merchantId: 2,
    merchantName: 'ป้าสมร ขนมไทยมงคลเกาะเกร็ด',
    salesAmount: 3900,
    averageSales: 4200,
    salesRatio: 0.93,
    salesStatus: 'normal',
    boostRecommended: false,
    analyzedAt: '2026-10-13 08:00:00',
    criticalHours: 'ปกติ',
    aiInsight: 'ยอดขายมีเสถียรภาพตามเกณฑ์มาตรฐาน มีลูกค้าประจำหนาแน่น',
    suggestedAction: 'รักษามาตรฐานและเป็นจุดรับสิทธิ 60/40 ต่อเนื่อง'
  }
];

export const INITIAL_DISTRICT_STAMPS: DistrictStamp[] = [
  {
    stampId: 1,
    stampName: 'ตราของดีเมืองนนท์ (ทุเรียนก้านยาว)',
    distId: 1201,
    provId: 12,
    distName: 'เมืองนนทบุรี',
    provName: 'นนทบุรี',
    iconName: 'Crown',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop&q=80',
    rarity: 'special',
    description: 'แสตมป์ดิจิทัลเกียรติยศประจำอำเภอเมืองนนทบุรี สัญลักษณ์แห่งทุเรียนนนท์อันเลื่องชื่อ',
    symbolMeaning: 'สัญลักษณ์แห่งความอุดมสมบูรณ์และภูมิปัญญาชาวสวนเมืองนนท์'
  },
  {
    stampId: 2,
    stampName: 'ตรามนต์เสน่ห์เกาะเกร็ด (เครื่องปั้นดินเผา)',
    distId: 1206,
    provId: 12,
    distName: 'ปากเกร็ด (เกาะเกร็ด)',
    provName: 'นนทบุรี',
    iconName: 'Sparkles',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&auto=format&fit=crop&q=80',
    rarity: 'rare',
    description: 'แสตมป์ดินเผาแกะสลักลวดลายวิจิตร เอกลักษณ์ชุมชนไทย-รามัญ เกาะเกร็ด',
    symbolMeaning: 'สัญลักษณ์ช่างปั้นดินเผาชาวมอญสืบทอดกว่าสองร้อยปี'
  },
  {
    stampId: 3,
    stampName: 'ตราพระนครมงคล (เสาชิงช้า)',
    distId: 1001,
    provId: 10,
    distName: 'พระนคร',
    provName: 'กรุงเทพมหานคร',
    iconName: 'Landmark',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=300&auto=format&fit=crop&q=80',
    rarity: 'special',
    description: 'แสตมป์มงคลศูนย์กลางพระนคร ย่านค้าขายประวัติศาสตร์และสถาปัตยกรรมไทยโบราณ',
    symbolMeaning: 'สัญลักษณ์ประวัติศาสตร์กรุงรัตนโกสินทร์'
  },
  {
    stampId: 4,
    stampName: 'ตราเวียงพิงค์แม่ริม (ศิลปาชีพล้านนา)',
    distId: 5007,
    provId: 50,
    distName: 'แม่ริม',
    provName: 'เชียงใหม่',
    iconName: 'Flower2',
    imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=300&auto=format&fit=crop&q=80',
    rarity: 'common',
    description: 'แสตมป์หัตถศิลป์ล้านนา กลิ่นอายวัฒนธรรมขุนเขาและดอกไม้เมืองหนาว',
    symbolMeaning: 'สัญลักษณ์ความอ่อนช้อยและงานหัตถกรรมพื้นถิ่นล้านนา'
  }
];

export const INITIAL_MISSIONS: Mission[] = [
  {
    missionId: 1,
    missionName: 'อิ่มอร่อย ช่วยร้านชุมชน (ท่าน้ำนนท์)',
    description: 'อุดหนุนเครื่องดื่มหรืออาหารจากร้านกาแฟโบราณลุงเปี๊ยก ครบ 150 บาท รับฟรีแสตมป์ดิจิทัลของดีเมืองนนท์ทันที! จำกัด 10 สิทธิ์แรกเท่านั้น',
    targetMerchantId: 1,
    targetMerchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    targetDistId: 1201,
    minSpend: 150,
    maxRecipients: 10,
    currentRecipients: 6, // 4 slots left!
    rewardStampId: 1,
    startDateTime: '2026-10-01 00:00:00',
    endDateTime: '2026-11-30 23:59:59',
    status: 'active',
    category: 'กระตุ้นยอดขายช่วงบ่าย (AI Recommended)',
    completedUserIds: []
  },
  {
    missionId: 2,
    missionName: 'สืบสานหัตถกรรม ดินเผาเกาะเกร็ด',
    description: 'เลือกซื้อสินค้าหัตถกรรม OTOP หรือเครื่องปั้นดินเผาที่ร้านค้าเกาะเกร็ด ครบ 200 บาท รับแสตมป์มนต์เสน่ห์เกาะเกร็ด สะสมแลกส่วนลดสินค้าชุมชน',
    targetMerchantId: 3,
    targetMerchantName: 'เครื่องปั้นดินเผาบ้านมอญ เกาะเกร็ด OTOP',
    targetDistId: 1206,
    minSpend: 200,
    maxRecipients: 25,
    currentRecipients: 12,
    rewardStampId: 2,
    startDateTime: '2026-10-01 00:00:00',
    endDateTime: '2026-11-30 23:59:59',
    status: 'active',
    category: 'ส่งเสริมสินค้า OTOP ชุมชน',
    completedUserIds: []
  },
  {
    missionId: 3,
    missionName: 'แอ่วแม่ริม ชิมข้าวซอยสูตรโบราณ',
    description: 'อุดหนุนข้าวซอยรสเด็ดยายคำ ครบ 150 บาท รับแสตมป์เวียงพิงค์แม่ริม ร่วมกระตุ้นร้านค้ารายย่อยเชียงใหม่',
    targetMerchantId: 5,
    targetMerchantName: 'ข้าวซอยโบราณยายคำ แม่ริม',
    targetDistId: 302,
    minSpend: 150,
    maxRecipients: 15,
    currentRecipients: 5,
    rewardStampId: 4,
    startDateTime: '2026-10-01 00:00:00',
    endDateTime: '2026-11-30 23:59:59',
    status: 'active',
    category: 'กระตุ้นเศรษฐกิจท่องเที่ยวท้องถิ่น',
    completedUserIds: []
  }
];

export const INITIAL_USER_STAMPS: UserStamp[] = [
  {
    userStampId: 1,
    userId: 1,
    stampId: 1, // เมืองนนท์
    count: 3,
    earnedAt: '2026-10-11 14:20:00',
    earnSource: 'spend_150',
    qualifyingAmount: 180
  },
  {
    userStampId: 2,
    userId: 1,
    stampId: 2, // เกาะเกร็ด
    count: 2,
    earnedAt: '2026-10-12 11:45:00',
    earnSource: 'mission',
    qualifyingAmount: 220
  }
];

export const INITIAL_REWARDS: Reward[] = [
  {
    rewardId: 1,
    rewardName: 'คูปองส่วนลดเงินสด 50 บาท (ร้าน OTOP ทั่วประเทศ)',
    rewardType: 'discount_voucher',
    description: 'ใช้เป็นส่วนลดทันทีเมื่อซื้อสินค้า OTOP หรือร้านค้าชุมชนที่เข้าร่วมโครงการยอด 150 บาทขึ้นไป',
    requiredStampCount: 3,
    status: 'available',
    originalValue: 50,
    discountValue: 50,
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&auto=format&fit=crop&q=80',
    provinceName: 'ทั่วประเทศ',
    remainingStock: 45
  },
  {
    rewardId: 2,
    rewardName: 'ชุดแก้วกาแฟดินเผา เกาะเกร็ด OTOP 5 ดาว',
    rewardType: 'otop_product',
    description: 'ชุดแก้วกาแฟดินเผางานฝีมือชาวมอญเกาะเกร็ด เผาด้วยเตาโบราณ สวยงามทนทาน พร้อมจานรอง',
    requiredStampCount: 5,
    stampIdRequired: 2,
    status: 'available',
    originalValue: 320,
    discountValue: 320,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    provinceName: 'นนทบุรี',
    remainingStock: 18
  },
  {
    rewardId: 3,
    rewardName: 'กล่องของขวัญทุเรียนทอดเกรดพรีเมียม เมืองนนท์ (250g)',
    rewardType: 'otop_product',
    description: 'ทุเรียนทอดกรอบคัดพิเศษ กรอบ หอม อร่อย ผลิตภัณฑ์เด่นประจำจังหวัดนนทบุรี',
    requiredStampCount: 8,
    stampIdRequired: 1,
    status: 'available',
    originalValue: 450,
    discountValue: 450,
    imageUrl: 'https://images.unsplash.com/photo-1577069808021-7681f21134fb?w=500&auto=format&fit=crop&q=80',
    provinceName: 'นนทบุรี',
    remainingStock: 12
  },
  {
    rewardId: 4,
    rewardName: 'ผ้าพันคอทอมือลายโบราณ ศิลปาชีพเชียงใหม่',
    rewardType: 'souvenir',
    description: 'ผ้าทอย้อมสีธรรมชาติจากเปลือกไม้ นุ่ม เบาสบาย ลวดลายอัตลักษณ์ล้านนา',
    requiredStampCount: 6,
    stampIdRequired: 4,
    status: 'available',
    originalValue: 390,
    discountValue: 390,
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&auto=format&fit=crop&q=80',
    provinceName: 'เชียงใหม่',
    remainingStock: 9
  }
];

// Two weeks of sample sales for the five approved shops, with distinct quiet periods.
const RECENT_SAMPLE_TRANSACTIONS: SalesTransaction[] = Array.from({ length: 14 }, (_, day) => {
  const date = `2026-10-${String(day + 9).padStart(2, '0')}`;
  const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  return INITIAL_MERCHANTS.filter(merchant => merchant.status === 'approved').flatMap(merchant => {
    const amountsByMerchant: Record<number, number[]> = {
      1: [240, 280, 90], // Coffee shop: quiet afternoons
      2: weekend ? [230, 380, 210] : [150, 230, 100], // Sweets: stronger weekends
      3: weekend ? [280, 450, 270] : [130, 240, 80], // Pottery: stronger weekends
      4: [390, 510, 420], // Fruit shop: steady throughout the day
      5: [170, 330, 85], // Noodles: quiet after lunch
    };
    return ['09:15:00', '12:30:00', '15:20:00'].map((time, slot) => {
      const totalAmount = amountsByMerchant[merchant.mchId][slot] + ((day * 17 + merchant.mchId * 11) % 5) * 10;
      return {
        txId: 990000 + day * 100 + merchant.mchId * 10 + slot,
        userId: INITIAL_USERS[0].userId,
        userName: INITIAL_USERS[0].name,
        merchantId: merchant.mchId,
        merchantName: merchant.shopName,
        totalAmount,
        userPaidAmount: totalAmount * 0.4,
        govSubsidizedAmount: totalAmount * 0.6,
        txTimestamp: `${date} ${time}`,
        distId: merchant.distId,
        status: 'completed' as const,
        note: 'ข้อมูลการขายจำลองสำหรับทดสอบการวิเคราะห์ย้อนหลัง',
      };
    });
  });
}).flat();

export const INITIAL_TRANSACTIONS: SalesTransaction[] = ([
  ...RECENT_SAMPLE_TRANSACTIONS,
  // --- ตุลาคม 2569 (Current Month - October 2026) ---
  {
    txId: 981248,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 250,
    userPaidAmount: 100, // 40%
    govSubsidizedAmount: 150, // 60%
    txTimestamp: '2026-10-14 08:30:15',
    distId: 1201,
    status: 'completed',
    note: 'ชำระค่ากาแฟดริปโบราณและขนมปังสังขยาชุดพิเศษ',
    earnedStampId: 1
  },
  {
    txId: 981241,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 200,
    userPaidAmount: 80, // 40%
    govSubsidizedAmount: 120, // 60%
    txTimestamp: '2026-10-13 14:15:20',
    distId: 1201,
    status: 'completed',
    note: 'ชำระค่ากาแฟและของว่าง (ได้สิทธิ 60/40 และแสตมป์)',
    earnedStampId: 1
  },
  {
    txId: 981235,
    userId: 3,
    userName: 'น.ส.วิภาดา รุ่งอรุณ',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 180,
    userPaidAmount: 72,
    govSubsidizedAmount: 108,
    txTimestamp: '2026-10-12 11:20:45',
    distId: 1201,
    status: 'completed',
    note: 'ชาไทยเย็น 2 แก้วและไข่ลวก 2 ฟอง',
    earnedStampId: 1
  },
  {
    txId: 981228,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 320,
    userPaidAmount: 128,
    govSubsidizedAmount: 192,
    txTimestamp: '2026-10-10 15:05:12',
    distId: 1201,
    status: 'completed',
    note: 'ชุดกาแฟโบราณของฝากเมืองนนท์ 2 กล่อง',
    earnedStampId: 1
  },
  {
    txId: 981215,
    userId: 4,
    userName: 'นายธนพล เจริญทรัพย์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 150,
    userPaidAmount: 60,
    govSubsidizedAmount: 90,
    txTimestamp: '2026-10-08 09:40:00',
    distId: 1201,
    status: 'completed',
    note: 'โอเลี้ยงยกล้อ และปาท่องโก๋'
  },
  {
    txId: 981190,
    userId: 5,
    userName: 'นางสมจิตต์ บุญเกิด',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 400,
    userPaidAmount: 160,
    govSubsidizedAmount: 240,
    txTimestamp: '2026-10-05 13:25:33',
    distId: 1201,
    status: 'completed',
    note: 'สั่งเครื่องดื่มสำหรับประชุมกลุ่มวิสาหกิจ'
  },
  {
    txId: 981170,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 160,
    userPaidAmount: 64,
    govSubsidizedAmount: 96,
    txTimestamp: '2026-10-03 16:10:18',
    distId: 1201,
    status: 'completed',
    note: 'กาแฟเย็นและขนมปังเนยสด'
  },
  {
    txId: 981155,
    userId: 6,
    userName: 'นายสุรชัย วงศ์วาน',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 220,
    userPaidAmount: 88,
    govSubsidizedAmount: 132,
    txTimestamp: '2026-10-01 10:15:00',
    distId: 1201,
    status: 'completed',
    note: 'ชำระค่าเครื่องดื่มรอบเช้า'
  },

  // ร้านอื่นๆ ในเดือนตุลาคม 2569
  {
    txId: 981220,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 2,
    merchantName: 'ป้าสมร ขนมไทยมงคลเกาะเกร็ด',
    totalAmount: 160,
    userPaidAmount: 64,
    govSubsidizedAmount: 96,
    txTimestamp: '2026-10-11 11:20:05',
    distId: 1206,
    status: 'completed',
    note: 'ซื้อทองหยอด ฝอยทอง',
    earnedStampId: 2
  },
  {
    txId: 981105,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 4,
    merchantName: 'สวนทุเรียนเมืองนนท์ ลุงเชวง',
    totalAmount: 500,
    userPaidAmount: 200,
    govSubsidizedAmount: 300,
    txTimestamp: '2026-10-09 15:10:44',
    distId: 1201,
    status: 'completed',
    note: 'ซื้อผลไม้แปรรูปชุมชน'
  },
  {
    txId: 981098,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 5,
    merchantName: 'ข้าวซอยโบราณยายคำ แม่ริม',
    totalAmount: 210,
    userPaidAmount: 84,
    govSubsidizedAmount: 126,
    txTimestamp: '2026-10-07 12:30:00',
    distId: 5007,
    status: 'completed',
    note: 'ข้าวซอยไก่พิเศษ 2 ชาม',
    earnedStampId: 4
  },
  {
    txId: 981080,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 3,
    merchantName: 'เครื่องปั้นดินเผาบ้านมอญ เกาะเกร็ด OTOP',
    totalAmount: 350,
    userPaidAmount: 140,
    govSubsidizedAmount: 210,
    txTimestamp: '2026-10-04 14:00:00',
    distId: 1206,
    status: 'completed',
    note: 'แจกันดินเผาแกะสลักมอญ',
    earnedStampId: 2
  },

  // --- กันยายน 2569 (Last Month - September 2026) ---
  {
    txId: 980950,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 200,
    userPaidAmount: 80,
    govSubsidizedAmount: 120,
    txTimestamp: '2026-09-28 14:30:00',
    distId: 1201,
    status: 'completed',
    note: 'ชำระค่าเครื่องดื่มและขนม'
  },
  {
    txId: 980932,
    userId: 3,
    userName: 'น.ส.วิภาดา รุ่งอรุณ',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 350,
    userPaidAmount: 140,
    govSubsidizedAmount: 210,
    txTimestamp: '2026-09-25 15:45:10',
    distId: 1201,
    status: 'completed',
    note: 'ชุดกาแฟและขนมปังปิ้ง'
  },
  {
    txId: 980915,
    userId: 4,
    userName: 'นายธนพล เจริญทรัพย์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 180,
    userPaidAmount: 72,
    govSubsidizedAmount: 108,
    txTimestamp: '2026-09-21 11:10:00',
    distId: 1201,
    status: 'completed',
    note: 'กาแฟร้อน 2 แก้ว'
  },
  {
    txId: 980890,
    userId: 5,
    userName: 'นางสมจิตต์ บุญเกิด',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 450,
    userPaidAmount: 180,
    govSubsidizedAmount: 270,
    txTimestamp: '2026-09-18 13:50:00',
    distId: 1201,
    status: 'completed',
    note: 'เครื่องดื่มและเบเกอรี่ชุมชน'
  },
  {
    txId: 980860,
    userId: 6,
    userName: 'นายสุรชัย วงศ์วาน',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 280,
    userPaidAmount: 112,
    govSubsidizedAmount: 168,
    txTimestamp: '2026-09-14 09:30:15',
    distId: 1201,
    status: 'completed',
    note: 'เครื่องดื่มเช้า'
  },
  {
    txId: 980840,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 150,
    userPaidAmount: 60,
    govSubsidizedAmount: 90,
    txTimestamp: '2026-09-10 16:20:00',
    distId: 1201,
    status: 'completed',
    note: 'ชาดำเย็นและขนมปัง'
  },
  {
    txId: 980820,
    userId: 7,
    userName: 'น.ส.อารียา โสภณ',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 320,
    userPaidAmount: 128,
    govSubsidizedAmount: 192,
    txTimestamp: '2026-09-05 14:10:00',
    distId: 1201,
    status: 'completed',
    note: 'ชุดกาแฟโบราณ'
  },
  {
    txId: 980805,
    userId: 4,
    userName: 'นายธนพล เจริญทรัพย์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 220,
    userPaidAmount: 88,
    govSubsidizedAmount: 132,
    txTimestamp: '2026-09-02 10:45:00',
    distId: 1201,
    status: 'completed',
    note: 'กาแฟเย็นและขนม'
  },

  // --- สิงหาคม 2569 (August 2026) ---
  {
    txId: 980680,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 260,
    userPaidAmount: 104,
    govSubsidizedAmount: 156,
    txTimestamp: '2026-08-28 15:20:00',
    distId: 1201,
    status: 'completed',
    note: 'เครื่องดื่มรอบบ่าย'
  },
  {
    txId: 980650,
    userId: 3,
    userName: 'น.ส.วิภาดา รุ่งอรุณ',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 300,
    userPaidAmount: 120,
    govSubsidizedAmount: 180,
    txTimestamp: '2026-08-22 13:40:00',
    distId: 1201,
    status: 'completed',
    note: 'เครื่องดื่มและขนมปังปิ้งเนยนม'
  },
  {
    txId: 980620,
    userId: 5,
    userName: 'นางสมจิตต์ บุญเกิด',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 420,
    userPaidAmount: 168,
    govSubsidizedAmount: 252,
    txTimestamp: '2026-08-16 11:15:00',
    distId: 1201,
    status: 'completed',
    note: 'ชุดกาแฟดริปโบราณ'
  },
  {
    txId: 980590,
    userId: 6,
    userName: 'นายสุรชัย วงศ์วาน',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 190,
    userPaidAmount: 76,
    govSubsidizedAmount: 114,
    txTimestamp: '2026-08-10 14:50:00',
    distId: 1201,
    status: 'completed',
    note: 'กาแฟเย็นและไข่กระทะ'
  },
  {
    txId: 980560,
    userId: 7,
    userName: 'น.ส.อารียา โสภณ',
    merchantId: 1,
    merchantName: 'ร้านกาแฟโบราณลุงเปี๊ยก (ท่าน้ำนนท์)',
    totalAmount: 380,
    userPaidAmount: 152,
    govSubsidizedAmount: 228,
    txTimestamp: '2026-08-04 10:30:00',
    distId: 1201,
    status: 'completed',
    note: 'ชำระค่าเครื่องดื่มและของฝาก'
  }
] satisfies SalesTransaction[]).sort((a, b) => b.txTimestamp.localeCompare(a.txTimestamp));

export const INITIAL_WALLET: Wallet = {
  walletId: 101,
  userId: 1,
  balance: 2450.00,
  updatedAt: '2026-10-12 13:45:10'
};

export const INITIAL_USER_GRANT: UserGrant = {
  grantId: 501,
  userId: 1,
  grantName: 'โครงการกระตุ้นเศรษฐกิจไทยช่วยไทยพลีส สิทธิ 60/40',
  totalGrantAmount: 10000.00,
  remainingAmount: 7680.00, // Remaining gov subsidy
  govPayRatio: 0.40,
  userPayRatio: 0.60,
  grantedAt: '2026-10-01 00:00:00',
  status: 'active'
};

export const INITIAL_REDEMPTIONS: StampRedemption[] = [
  {
    redemptionId: 7001,
    userId: 1,
    userName: 'นายกิตติคุณ ศรีสวัสดิ์',
    rewardId: 1,
    rewardName: 'คูปองส่วนลดเงินสด 50 บาท (ร้าน OTOP ทั่วประเทศ)',
    stampId: 1,
    quantity: 1,
    status: 'ready_to_use',
    redeemedAt: '2026-10-11 16:00:00',
    redemptionCode: 'THAI-STAMP-50B-8839'
  }
];
