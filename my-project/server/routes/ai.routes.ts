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
    where: {
      Boost_Recommended: true,
    },
    include: {
      merchants: {
        include: {
          districts: true,
        },
      },
    },
    orderBy: {
      Analyzed_At: "desc",
    },
  });

  sendJson(res, targetShops);
});
