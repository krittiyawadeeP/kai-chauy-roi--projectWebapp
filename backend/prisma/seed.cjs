const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. provinces
  const prov1 = await prisma.provinces.create({ data: { Prov_Name: 'Bangkok' } });
  const prov2 = await prisma.provinces.create({ data: { Prov_Name: 'Chiang Mai' } });

  // 2. districts
  const dist1 = await prisma.districts.create({ data: { Dist_Name: 'Pathum Wan', Prov_ID: prov1.Prov_ID } });
  const dist2 = await prisma.districts.create({ data: { Dist_Name: 'Mueang Chiang Mai', Prov_ID: prov2.Prov_ID } });

  // 3. users
  const user1 = await prisma.users.create({
    data: {
      Citizen_ID: '1111111111111',
      Phone: '0811111111',
      Password: 'password123',
      Province_ID: prov1.Prov_ID
    }
  });
  const user2 = await prisma.users.create({
    data: {
      Citizen_ID: '2222222222222',
      Phone: '0822222222',
      Password: 'password456',
      Province_ID: prov2.Prov_ID
    }
  });

  // 4. wallets
  await prisma.wallets.create({ data: { User_ID: user1.User_ID, Balance: 500.00 } });
  await prisma.wallets.create({ data: { User_ID: user2.User_ID, Balance: 1000.00 } });

  // 5. user_grants
  await prisma.user_grants.create({
    data: {
      User_ID: user1.User_ID,
      Grant_Name: 'โครงการคนละครึ่ง',
      Remaining_Amount: 1000.00
    }
  });
  await prisma.user_grants.create({
    data: {
      User_ID: user2.User_ID,
      Grant_Name: 'โครงการคนละครึ่ง',
      Remaining_Amount: 800.00
    }
  });

  // 6. merchants
  const mch1 = await prisma.merchants.create({
    data: {
      User_ID: user1.User_ID,
      Shop_Name: 'ร้านป้าแจ่ม ข้าวมันไก่',
      Category: 'Food',
      Dist_ID: dist1.Dist_ID
    }
  });
  const mch2 = await prisma.merchants.create({
    data: {
      User_ID: user2.User_ID,
      Shop_Name: 'ร้านลุงพล กาแฟโบราณ',
      Category: 'Beverage',
      Dist_ID: dist2.Dist_ID
    }
  });

  // 7. district_stamps
  const stamp1 = await prisma.district_stamps.create({ data: { Stamp_Name: 'แสตมป์ปทุมวัน', District_ID: dist1.Dist_ID } });
  const stamp2 = await prisma.district_stamps.create({ data: { Stamp_Name: 'แสตมป์เมืองเชียงใหม่', District_ID: dist2.Dist_ID } });

  // 8. missions
  const mission1 = await prisma.missions.create({
    data: {
      Mission_Name: 'กินข้าวมันไก่ครบ 5 จาน',
      Target_Merchant_ID: mch1.Mch_ID,
      Max_Recipients: 100,
      Start_DateTime: new Date('2026-01-01T00:00:00Z'),
      End_DateTime: new Date('2026-12-31T23:59:59Z'),
      Status: 'ACTIVE'
    }
  });
  const mission2 = await prisma.missions.create({
    data: {
      Mission_Name: 'ซื้อกาแฟ 10 แก้ว',
      Target_Merchant_ID: mch2.Mch_ID,
      Max_Recipients: 50,
      Start_DateTime: new Date('2026-01-01T00:00:00Z'),
      End_DateTime: new Date('2026-12-31T23:59:59Z'),
      Status: 'ACTIVE'
    }
  });

  // 9. rewards
  const reward1 = await prisma.rewards.create({
    data: {
      Reward_Name: 'ส่วนลด 50 บาท',
      Required_Stamp_Count: 5,
      Status: 'ACTIVE'
    }
  });
  const reward2 = await prisma.rewards.create({
    data: {
      Reward_Name: 'ฟรีเครื่องดื่ม 1 แก้ว',
      Required_Stamp_Count: 10,
      Status: 'ACTIVE'
    }
  });

  // 10. sales_transactions
  const tx1 = await prisma.sales_transactions.create({
    data: {
      User_ID: user2.User_ID, // User2 buys from Mch1
      Merchant_ID: mch1.Mch_ID,
      Total_Amount: 100.00,
      User_Paid_Amount: 40.00,
      Gov_Subsidized_Amount: 60.00,
      Tx_Timestamp: new Date(),
      District_ID: dist1.Dist_ID,
      Status: 'COMPLETED'
    }
  });
  const tx2 = await prisma.sales_transactions.create({
    data: {
      User_ID: user1.User_ID, // User1 buys from Mch2
      Merchant_ID: mch2.Mch_ID,
      Total_Amount: 50.00,
      User_Paid_Amount: 20.00,
      Gov_Subsidized_Amount: 30.00,
      Tx_Timestamp: new Date(),
      District_ID: dist2.Dist_ID,
      Status: 'COMPLETED'
    }
  });

  // 11. user_stamps
  const uStamp1 = await prisma.user_stamps.create({
    data: {
      User_ID: user2.User_ID,
      Stamp_ID: stamp1.Stamp_ID,
      Earn_Source: 'TRANSACTION',
      Earned_At: new Date()
    }
  });
  const uStamp2 = await prisma.user_stamps.create({
    data: {
      User_ID: user1.User_ID,
      Stamp_ID: stamp2.Stamp_ID,
      Earn_Source: 'TRANSACTION',
      Earned_At: new Date()
    }
  });

  // 12. stamp_earn_transactions
  await prisma.stamp_earn_transactions.create({
    data: {
      User_Stamp_ID: uStamp1.User_Stamp_ID,
      Tx_ID: tx1.Tx_ID,
      Amount_Used: 100.00
    }
  });
  await prisma.stamp_earn_transactions.create({
    data: {
      User_Stamp_ID: uStamp2.User_Stamp_ID,
      Tx_ID: tx2.Tx_ID,
      Amount_Used: 50.00
    }
  });

  // 13. stamp_redemptions
  await prisma.stamp_redemptions.create({
    data: {
      User_ID: user2.User_ID,
      Reward_ID: reward1.Reward_ID,
      Stamp_ID: stamp1.Stamp_ID,
      Quantity: 1,
      Status: 'COMPLETED',
      Redeemed_At: new Date()
    }
  });
  await prisma.stamp_redemptions.create({
    data: {
      User_ID: user1.User_ID,
      Reward_ID: reward2.Reward_ID,
      Stamp_ID: stamp2.Stamp_ID,
      Quantity: 1,
      Status: 'COMPLETED',
      Redeemed_At: new Date()
    }
  });

  // 14. ai_sales_analysis
  await prisma.ai_sales_analysis.create({
    data: {
      Merchant_ID: mch1.Mch_ID,
      Sales_Amount: 15000.00,
      Average_Sales: 12000.00,
      Sales_Ratio: 1.25,
      Sales_Status: 'GROWING',
      Analyzed_At: new Date()
    }
  });
  await prisma.ai_sales_analysis.create({
    data: {
      Merchant_ID: mch2.Mch_ID,
      Sales_Amount: 8000.00,
      Average_Sales: 9000.00,
      Sales_Ratio: 0.88,
      Sales_Status: 'DECLINING',
      Analyzed_At: new Date()
    }
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
