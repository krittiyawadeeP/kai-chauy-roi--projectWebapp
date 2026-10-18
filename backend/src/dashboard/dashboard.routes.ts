import { Router } from "express";

import { sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";
import { buildGeographicDashboard, buildMerchantLocations } from "./geographic-dashboard";

export const dashboardRoutes = Router();

dashboardRoutes.get('/geography', async (_req, res) => {
  const [provinces, transactions, grants, users, merchants] = await Promise.all([
    prisma.provinces.findMany({ select: { Prov_ID: true, Prov_Name: true, districts: { select: { Dist_ID: true, _count: { select: { merchants: true } } } } } }),
    prisma.sales_transactions.groupBy({ by: ['District_ID'], where: { Status: 'COMPLETED' }, _sum: { Total_Amount: true, Gov_Subsidized_Amount: true, User_Paid_Amount: true }, _count: { Tx_ID: true } }),
    prisma.user_grants.groupBy({ by: ['User_ID'], _sum: { Total_Grant_Amount: true, Remaining_Amount: true } }),
    prisma.users.findMany({ select: { User_ID: true, Province_ID: true } }),
    prisma.merchants.findMany({ select: {
      Mch_ID: true, Shop_Name: true, Category: true, Lat: true, Lng: true,
      districts: { select: { Dist_Name: true, provinces: { select: { Prov_ID: true, Prov_Name: true } } } },
    } }),
  ]);
  sendJson(res, {
    generatedAt: new Date().toISOString(),
    provinces: buildGeographicDashboard(provinces, transactions, grants, users),
    merchants: buildMerchantLocations(merchants),
  });
});

// --- Dashboard: System-wide income/expense overview ---
dashboardRoutes.get("/", async (_req, res) => {
  const [txAgg, grantsAgg, grants] = await Promise.all([
    prisma.sales_transactions.aggregate({
      where: { Status: 'COMPLETED' },
      _sum: { Total_Amount: true, Gov_Subsidized_Amount: true, User_Paid_Amount: true },
      _count: { Tx_ID: true },
    }),
    prisma.user_grants.aggregate({
      _sum: { Total_Grant_Amount: true, Remaining_Amount: true },
      _count: { Grant_ID: true },
    }),
    prisma.user_grants.findMany({ select: { Status: true, Total_Grant_Amount: true, Remaining_Amount: true } }),
  ]);

  const totalBudgetAllocated = Number(grantsAgg._sum.Total_Grant_Amount ?? 0);
  const totalBudgetRemaining = Number(grantsAgg._sum.Remaining_Amount ?? 0);
  const totalBudgetSpent = totalBudgetAllocated - totalBudgetRemaining;

  sendJson(res, {
    transactions: {
      count: txAgg._count.Tx_ID,
      totalRevenue: Number(txAgg._sum.Total_Amount ?? 0),
      govSubsidized: Number(txAgg._sum.Gov_Subsidized_Amount ?? 0),
      userPaid: Number(txAgg._sum.User_Paid_Amount ?? 0),
    },
    grants: {
      count: grantsAgg._count.Grant_ID,
      totalAllocated: totalBudgetAllocated,
      totalSpent: totalBudgetSpent,
      totalRemaining: totalBudgetRemaining,
      activeGrants: grants.filter(g => g.Status === 'ACTIVE').length,
    },
  });
});
