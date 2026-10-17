import { Router } from "express";

import { createSession, requireAuth, requireMerchant, type AuthRequest } from "../lib/auth";
import { badRequest, notFound, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";

export const merchantRoutes = Router();

merchantRoutes.post("/register", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Shop_Name, Category, Dist_ID } = req.body;
  if (!Citizen_ID || !Phone || !Password || !Shop_Name || !Province_ID || !Dist_ID) {
    return badRequest(res, "Citizen_ID, Phone, Password, Province_ID, Shop_Name, and Dist_ID are required");
  }
  if (!/^\d{13}$/.test(String(Citizen_ID))) return badRequest(res, "Citizen_ID must contain 13 digits");
  if (!/^\d{9,15}$/.test(String(Phone).replace(/\D/g, ""))) return badRequest(res, "Phone number is invalid");
  if (String(Password).length < 6) return badRequest(res, "Password must be at least 6 characters");
  const provinceId = Number(Province_ID);
  const districtId = Number(Dist_ID);
  if (!Number.isInteger(provinceId) || provinceId <= 0 || !Number.isInteger(districtId) || districtId <= 0) {
    return badRequest(res, "Province_ID and Dist_ID must be positive integers");
  }

  try {
    const district = await prisma.districts.findUnique({ where: { Dist_ID: districtId } });
    if (!district || district.Prov_ID !== provinceId) {
      return badRequest(res, "The selected district does not belong to the selected province");
    }
    const result = await prisma.$transaction(async tx => {
      const user = await tx.users.create({
        data: {
          Citizen_ID: String(Citizen_ID),
          Phone: String(Phone).replace(/\D/g, ""),
          Password: String(Password),
          Province_ID: provinceId,
          Role: "MERCHANT",
          wallets: { create: { Balance: 0, Status: "ACTIVE" } },
          user_grants: {
            create: {
              Grant_Name: "Default government subsidy",
              Total_Grant_Amount: 1000,
              Remaining_Amount: 1000,
              Gov_Pay_Ratio: 0.6,
              User_Pay_Ratio: 0.4,
              Status: "ACTIVE",
            },
          },
        },
      });
      const merchant = await tx.merchants.create({
        data: {
          User_ID: user.User_ID,
          Shop_Name: String(Shop_Name).trim(),
          Category: Category ? String(Category) : null,
          Dist_ID: districtId,
        },
        include: { districts: { include: { provinces: true } } },
      });
      return { user, merchant };
    });
    const token = createSession(result.user.User_ID, "MERCHANT");
    return sendJson(res, { token, user: result.user, merchant: result.merchant }, 201);
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") return sendJson(res, { message: "Citizen_ID or Phone is already registered" }, 409);
    if (prismaError.code === "P2003") return badRequest(res, "Province or district does not exist in the database");
    console.error("Merchant registration failed", error);
    return sendJson(res, { message: "Merchant registration failed. Check backend logs for details." }, 500);
  }
});

merchantRoutes.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { Shop_Name, Category, Lat, Lng, Dist_ID } = req.body;

  if (!Shop_Name || !Dist_ID) {
    return badRequest(res, "Shop_Name and Dist_ID are required");
  }

  if (!Number.isInteger(Number(Dist_ID)) || Number(Dist_ID) <= 0) {
    return badRequest(res, "Dist_ID must be a positive integer");
  }

  const existingMerchant = await prisma.merchants.findFirst({ where: { User_ID: req.user!.userId } });
  if (existingMerchant) return badRequest(res, "This user already has a merchant profile");

  const district = await prisma.districts.findUnique({ where: { Dist_ID: Number(Dist_ID) } });
  if (!district) return badRequest(res, "Dist_ID does not match a district in the database");

  const merchant = await prisma.merchants.create({
    data: {
      User_ID: req.user!.userId,
      Shop_Name,
      Category,
      Lat,
      Lng,
      Dist_ID: Number(Dist_ID),
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

  if (Shop_Name !== undefined && !String(Shop_Name).trim()) return badRequest(res, "Shop_Name cannot be empty");
  if (Lat !== undefined && (typeof Lat !== "number" || Lat < -90 || Lat > 90)) return badRequest(res, "Lat must be between -90 and 90");
  if (Lng !== undefined && (typeof Lng !== "number" || Lng < -180 || Lng > 180)) return badRequest(res, "Lng must be between -180 and 180");
  if (Dist_ID !== undefined && (!Number.isInteger(Number(Dist_ID)) || Number(Dist_ID) <= 0)) return badRequest(res, "Dist_ID must be a positive integer");

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

  if (!Number.isInteger(Number(User_ID)) || Number(User_ID) <= 0 || !Number.isFinite(Number(Total_Amount)) || Number(Total_Amount) <= 0 || !Number.isInteger(Number(District_ID)) || Number(District_ID) <= 0) {
    return badRequest(res, "User_ID, Total_Amount, and District_ID are required");
  }

  const userId = Number(User_ID);
  const districtId = Number(District_ID);
  const totalAmount = Number(Number(Total_Amount).toFixed(2));

  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  const customer = await prisma.users.findUnique({ where: { User_ID: userId } });
  if (!customer) return notFound(res, "Customer not found");

  const activeGrant = await prisma.user_grants.findFirst({
    where: {
      User_ID: userId,
      Status: "ACTIVE",
    },
    orderBy: {
      Granted_At: "desc",
    },
  });

  const totalAmount = Number(Total_Amount);

  // Fetch current subsidy ratio from global grant_policy
  const latestPolicy = await prisma.grant_policy.findFirst({
    orderBy: { Effective_From: "desc" },
  });
  const govRatio = latestPolicy ? Number(latestPolicy.Gov_Pay_Ratio) : 0.4;
  const userRatio = latestPolicy ? Number(latestPolicy.User_Pay_Ratio) : 0.6;

  const requestedGovAmount = totalAmount * govRatio;
  const remainingGrant = activeGrant ? Number(activeGrant.Remaining_Amount) : 0;
  const govSubsidizedAmount = Math.min(requestedGovAmount, remainingGrant);
  const userPaidAmount = Number((totalAmount - govSubsidizedAmount).toFixed(2));

  const transaction = await prisma.$transaction(async (tx) => {
    const sale = await tx.sales_transactions.create({
      data: {
        User_ID: userId,
        Merchant_ID: merchant.Mch_ID,
        Total_Amount: totalAmount,
        User_Paid_Amount: userPaidAmount,
        Gov_Subsidized_Amount: govSubsidizedAmount,
        Tx_Timestamp: new Date(),
        District_ID: districtId,
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
          Remaining_Amount: Number((remainingGrant - govSubsidizedAmount).toFixed(2)),
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
