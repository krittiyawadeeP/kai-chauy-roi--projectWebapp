import { Router } from "express";

import { requireAuth, requireMerchant, type AuthRequest } from "../lib/auth";
import { badRequest, notFound, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";

export const merchantRoutes = Router();

merchantRoutes.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { Shop_Name, Category, Lat, Lng, Dist_ID } = req.body;

  if (!Shop_Name || !Dist_ID) {
    return badRequest(res, "Shop_Name and Dist_ID are required");
  }

  const merchant = await prisma.merchants.create({
    data: {
      User_ID: req.user!.userId,
      Shop_Name,
      Category,
      Lat,
      Lng,
      Dist_ID,
    },
    include: {
      districts: true,
    },
  });

  sendJson(res, merchant, 201);
});

merchantRoutes.get("/me", requireMerchant, async (req: AuthRequest, res) => {
  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      districts: true,
      users: true,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  sendJson(res, merchant);
});

merchantRoutes.patch("/me", requireMerchant, async (req: AuthRequest, res) => {
  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  const { Shop_Name, Category, Lat, Lng, Dist_ID } = req.body;

  const updatedMerchant = await prisma.merchants.update({
    where: {
      Mch_ID: merchant.Mch_ID,
    },
    data: {
      Shop_Name,
      Category,
      Lat,
      Lng,
      Dist_ID,
    },
  });

  sendJson(res, updatedMerchant);
});

merchantRoutes.post("/me/sales", requireMerchant, async (req: AuthRequest, res) => {
  const { User_ID, Total_Amount, District_ID, Status } = req.body;

  if (!User_ID || !Total_Amount || !District_ID) {
    return badRequest(res, "User_ID, Total_Amount, and District_ID are required");
  }

  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  const activeGrant = await prisma.user_grants.findFirst({
    where: {
      User_ID,
      Status: "ACTIVE",
    },
    orderBy: {
      Granted_At: "desc",
    },
  });

  const totalAmount = Number(Total_Amount);
  const govRatio = activeGrant ? Number(activeGrant.Gov_Pay_Ratio) : 0.6;
  const userRatio = activeGrant ? Number(activeGrant.User_Pay_Ratio) : 0.4;
  const requestedGovAmount = totalAmount * govRatio;
  const remainingGrant = activeGrant ? Number(activeGrant.Remaining_Amount) : 0;
  const govSubsidizedAmount = Math.min(requestedGovAmount, remainingGrant);
  const userPaidAmount = totalAmount * userRatio + (requestedGovAmount - govSubsidizedAmount);

  const transaction = await prisma.$transaction(async (tx) => {
    const sale = await tx.sales_transactions.create({
      data: {
        User_ID,
        Merchant_ID: merchant.Mch_ID,
        Total_Amount,
        User_Paid_Amount: userPaidAmount,
        Gov_Subsidized_Amount: govSubsidizedAmount,
        Tx_Timestamp: new Date(),
        District_ID,
        Status: Status ?? "COMPLETED",
      },
      include: {
        users: true,
        merchants: true,
      },
    });

    if (activeGrant && govSubsidizedAmount > 0) {
      await tx.user_grants.update({
        where: {
          Grant_ID: activeGrant.Grant_ID,
        },
        data: {
          Remaining_Amount: remainingGrant - govSubsidizedAmount,
        },
      });
    }

    return sale;
  });

  sendJson(res, transaction, 201);
});

merchantRoutes.get("/me/sales", requireMerchant, async (req: AuthRequest, res) => {
  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  const sales = await prisma.sales_transactions.findMany({
    where: {
      Merchant_ID: merchant.Mch_ID,
    },
    include: {
      users: true,
      districts: true,
    },
    orderBy: {
      Tx_Timestamp: "desc",
    },
  });

  sendJson(res, sales);
});
