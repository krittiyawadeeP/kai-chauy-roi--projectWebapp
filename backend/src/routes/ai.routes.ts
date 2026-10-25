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
  const targetShops = await prisma.ai_sales_analysis.findMany({
    include: {
      merchants: {
        include: {
          districts: {
            include: {
              provinces: true,
            },
          },
        },
      },
    },
    orderBy: {
      Sales_Ratio: "asc",
    },
  });

  const formatted = targetShops.map((item) => ({
    analysisId: Number(item.Analysis_ID),
    merchantId: item.Merchant_ID,
    merchantName: item.merchants?.Shop_Name || "ร้านค้าชุมชน",
    category: item.merchants?.Category || "อาหารและเครื่องดื่ม",
    districtName: item.merchants?.districts?.Dist_Name || "ในพื้นที่",
    provinceName: item.merchants?.districts?.provinces?.Prov_Name || "ทั่วประเทศ",
    salesRatio: Number(item.Sales_Ratio),
    salesStatus: item.Sales_Status,
    boostRecommended: true,
    missionTitle: `ซื้อสินค้าที่ ${item.merchants?.Shop_Name || "ร้านค้าเป้าหมาย"} ครบ 150 บาท`,
    missionDetail: `ช่วยกระตุ้นยอดขายร้านค้าชุมชน รับแสตมป์ดิจิทัลทันที`,
    criticalHours: "ช่วงบ่าย 13:00 - 16:00 น. • จำกัด 10 สิทธิ์แรก",
    imageUrl: item.Merchant_ID === 2
      ? "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
  }));

  sendJson(res, formatted);
});
