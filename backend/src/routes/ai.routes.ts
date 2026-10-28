import { Router } from "express";

import { sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";

export const aiRoutes = Router();

aiRoutes.post("/sales-analysis", async (_req, res) => {
  const merchants = await prisma.merchants.findMany({
    include: {
      sales_transactions: {
        orderBy: {
          Tx_Timestamp: "asc",
        },
      },
    },
  });

  const results = await Promise.all(
    merchants.map(async (merchant) => {
      const totalSales = merchant.sales_transactions.reduce((sum, tx) => {
        return sum + Number(tx.Total_Amount);
      }, 0);
      const averageSales = merchant.sales_transactions.length
        ? totalSales / merchant.sales_transactions.length
        : 0;
      const latestSale = merchant.sales_transactions.at(-1);
      const latestAmount = latestSale ? Number(latestSale.Total_Amount) : 0;
      const ratio = averageSales > 0 ? latestAmount / averageSales : 0;
      const isLowSales = ratio < 0.8;

      return prisma.ai_sales_analysis.create({
        data: {
          Merchant_ID: merchant.Mch_ID,
          Sales_Amount: latestAmount,
          Average_Sales: averageSales,
          Sales_Ratio: ratio,
          Sales_Status: isLowSales ? "LOW" : "NORMAL",
          Boost_Recommended: isLowSales,
          Analyzed_At: new Date(),
        },
        include: {
          merchants: true,
        },
      });
    }),
  );

  sendJson(res, results, 201);
});

aiRoutes.get("/target-shops", async (_req, res) => {
  const policy = await prisma.ai_mission_policy.findFirst({ orderBy: [{ Effective_From: 'desc' }, { Policy_ID: 'desc' }] });
  const targetShops = await prisma.missions.findMany({
    where: { Campaign_Week_Start: { not: null }, Status: 'ACTIVE', End_DateTime: { gt: new Date() } },
    include: { merchants: { include: { districts: { include: { provinces: true } } } } },
    orderBy: [{ Start_DateTime: 'asc' }, { Mission_ID: 'asc' }],
  });
  const formatted = targetShops.map((item) => ({
    analysisId: item.Mission_ID,
    merchantId: item.Target_Merchant_ID,
    merchantName: item.merchants.Shop_Name,
    category: item.merchants.Category || "ร้านค้าชุมชน",
    districtName: item.merchants.districts.Dist_Name,
    provinceName: item.merchants.districts.provinces.Prov_Name,
    provinceId: item.merchants.districts.Prov_ID,
    salesRatio: (item.Selection_Evidence as { ratio?: number } | null)?.ratio ?? 1,
    salesStatus: 'LOW',
    boostRecommended: true,
    missionTitle: item.Mission_Name,
    missionDetail: item.Description ?? '',
    criticalHours: `${String(Math.floor((item.Daily_Start_Minute ?? 0) / 60)).padStart(2, '0')}:00–${String(Math.floor((item.Daily_End_Minute ?? 0) / 60)).padStart(2, '0')}:00 น. ทุกวัน · ไม่จำกัดจำนวนผู้ร่วมภารกิจ`,
    campaignStart: item.Start_DateTime,
    campaignEnd: item.End_DateTime,
    dailyStampLimit: item.Ai_Daily_Stamp_Limit ?? policy?.Daily_Stamp_Limit ?? 1,
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
  }));

  sendJson(res, formatted);
});
