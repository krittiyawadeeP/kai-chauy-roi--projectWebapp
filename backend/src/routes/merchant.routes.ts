import { Router } from "express";

import { createSession, requireAuth, requireMerchant, type AuthRequest } from "../lib/auth";
import { badRequest, notFound, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchantCategory } from "../lib/merchant-category";
import { hashPin, validPin } from "../lib/pin";
import { getCurrentPolicy } from '../policy/policy';
import { remainingDailySubsidy } from "../lib/daily-subsidy";

export const merchantRoutes = Router();

merchantRoutes.post("/register", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Shop_Name, Owner_Name, User_Name, Pin, Category, Dist_ID, Lat, Lng } = req.body;
  if (!Citizen_ID || !Phone || !Password || !Shop_Name || !Province_ID || !Dist_ID) {
    return badRequest(res, "Citizen_ID, Phone, Password, Province_ID, Shop_Name, and Dist_ID are required");
  }
  if (!/^\d{13}$/.test(String(Citizen_ID))) return badRequest(res, "Citizen_ID must contain 13 digits");
  if (!/^\d{9,15}$/.test(String(Phone).replace(/\D/g, ""))) return badRequest(res, "Phone number is invalid");
  if (String(Password).length < 6) return badRequest(res, "Password must be at least 6 characters");
  if (Pin !== undefined && !validPin(Pin)) return badRequest(res, "Pin must contain exactly 6 digits");
  if (User_Name !== undefined && (typeof User_Name !== "string" || !User_Name.trim() || User_Name.length > 200)) return badRequest(res, "User_Name must be 1-200 characters");
  if (Owner_Name !== undefined && (typeof Owner_Name !== "string" || !Owner_Name.trim() || Owner_Name.length > 200)) return badRequest(res, "Owner_Name must be 1-200 characters");
  const category = merchantCategory(Category);
  if (Category !== undefined && category === undefined) return badRequest(res, "Invalid merchant Category");
  const provinceId = Number(Province_ID);
  const districtId = Number(Dist_ID);
  if (!Number.isInteger(provinceId) || provinceId <= 0 || !Number.isInteger(districtId) || districtId <= 0) {
    return badRequest(res, "Province_ID and Dist_ID must be positive integers");
  }
  if (Lat !== undefined && (typeof Lat !== "number" || Lat < -90 || Lat > 90)) return badRequest(res, "Lat must be between -90 and 90");
  if (Lng !== undefined && (typeof Lng !== "number" || Lng < -180 || Lng > 180)) return badRequest(res, "Lng must be between -180 and 180");

  try {
    const policy = await getCurrentPolicy();
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
          Name: User_Name?.trim(),
          Pin_Hash: Pin === undefined ? undefined : hashPin(Pin),
          Province_ID: provinceId,
          Role: "MERCHANT",
          wallets: { create: { Balance: 0, Status: "ACTIVE" } },
          user_grants: {
            create: {
              Grant_Name: "Default government subsidy",
              Total_Grant_Amount: Number(policy.Grant_Amount),
              Remaining_Amount: Number(policy.Grant_Amount),
              Status: "ACTIVE",
            },
          },
        },
      });
      const merchant = await tx.merchants.create({
        data: {
          User_ID: user.User_ID,
          Shop_Name: String(Shop_Name).trim(),
          Owner_Name: Owner_Name?.trim(),
          Category: category,
          Dist_ID: districtId,
          Lat,
          Lng,
          wallet: { create: { Balance: 0, Status: "ACTIVE" } },
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
  const { Shop_Name, Owner_Name, Category, Lat, Lng, Dist_ID } = req.body;

  if (!Shop_Name || !Dist_ID) {
    return badRequest(res, "Shop_Name and Dist_ID are required");
  }

  if (!Number.isInteger(Number(Dist_ID)) || Number(Dist_ID) <= 0) {
    return badRequest(res, "Dist_ID must be a positive integer");
  }
  if (Owner_Name !== undefined && (typeof Owner_Name !== "string" || !Owner_Name.trim() || Owner_Name.length > 200)) return badRequest(res, "Owner_Name must be 1-200 characters");
  const category = merchantCategory(Category);
  if (Category !== undefined && category === undefined) return badRequest(res, "Invalid merchant Category");

  const existingMerchant = await prisma.merchants.findFirst({ where: { User_ID: req.user!.userId } });
  if (existingMerchant) return badRequest(res, "This user already has a merchant profile");

  const district = await prisma.districts.findUnique({ where: { Dist_ID: Number(Dist_ID) } });
  if (!district) return badRequest(res, "Dist_ID does not match a district in the database");

  const merchant = await prisma.merchants.create({
    data: {
      User_ID: req.user!.userId,
      Shop_Name,
      Owner_Name: Owner_Name?.trim(),
      Category: category,
      Lat,
      Lng,
      Dist_ID: Number(Dist_ID),
      wallet: { create: { Balance: 0, Status: "ACTIVE" } },
    },
    include: {
      districts: true,
    },
  });

  sendJson(res, merchant, 201);
});

merchantRoutes.get("/me", requireMerchant, async (req: AuthRequest, res) => {
  let merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      districts: {
        include: {
          provinces: true,
        },
      },
      users: true,
      wallet: true,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  if (!merchant.wallet) {
    const newWallet = await prisma.wallets.create({
      data: {
        Merchant_ID: merchant.Mch_ID,
        Balance: 0,
        Status: "ACTIVE",
      },
    });
    merchant = { ...merchant, wallet: newWallet };
  }

  sendJson(res, merchant);
});

merchantRoutes.get("/me/wallet", requireMerchant, async (req: AuthRequest, res) => {
  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      wallet: true,
      users: true,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  let wallet = merchant.wallet;
  if (!wallet) {
    wallet = await prisma.wallets.create({
      data: {
        Merchant_ID: merchant.Mch_ID,
        Balance: 0,
        Status: "ACTIVE",
      },
    });
  }

  const sales = await prisma.sales_transactions.findMany({
    where: {
      Merchant_ID: merchant.Mch_ID,
    },
    include: {
      users: true,
    },
    orderBy: {
      Tx_Timestamp: "desc",
    },
  });

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.Total_Amount), 0);
  const userPaidTotal = sales.reduce((acc, s) => acc + Number(s.User_Paid_Amount), 0);
  const govSubsidizedTotal = sales.reduce((acc, s) => acc + Number(s.Gov_Subsidized_Amount), 0);

  sendJson(res, {
    wallet,
    summary: {
      totalRevenue,
      totalBills: sales.length,
      userPaidTotal,
      govSubsidizedTotal,
    },
    recentTransactions: sales,
  });
});

merchantRoutes.post("/me/wallet/withdraw", requireMerchant, async (req: AuthRequest, res) => {
  const { amount, promptpayOrAccount } = req.body;
  const withdrawAmount = Number(amount);

  if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
    return badRequest(res, "จำนวนเงินที่ต้องการถอนต้องมากกว่า 0 บาท");
  }

  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      wallet: true,
      users: true,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }

  let wallet = merchant.wallet;
  if (!wallet) {
    wallet = await prisma.wallets.create({
      data: {
        Merchant_ID: merchant.Mch_ID,
        Balance: 0,
        Status: "ACTIVE",
      },
    });
  }

  const currentBalance = Number(wallet.Balance);
  if (currentBalance < withdrawAmount) {
    return badRequest(res, "ยอดเงินในกระเป๋าไม่เพียงพอ มีอยู่ ฿" + currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " ต้องการถอน ฿" + withdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }));
  }

  const updatedWallet = await prisma.wallets.update({
    where: {
      Merchant_ID: merchant.Mch_ID,
    },
    data: {
      Balance: {
        decrement: withdrawAmount,
      },
    },
  });

  sendJson(res, {
    message: "ถอนเงินจำนวน ฿" + withdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " สำเร็จ เข้าบัญชี/พร้อมเพย์ " + (promptpayOrAccount || merchant.users.Phone),
    amount: withdrawAmount,
    newBalance: Number(updatedWallet.Balance),
    wallet: updatedWallet,
  });
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

  const { Shop_Name, Owner_Name, Category, Lat, Lng, Dist_ID } = req.body;

  if (Shop_Name !== undefined && !String(Shop_Name).trim()) return badRequest(res, "Shop_Name cannot be empty");
  if (Owner_Name !== undefined && (typeof Owner_Name !== "string" || !Owner_Name.trim() || Owner_Name.length > 200)) return badRequest(res, "Owner_Name must be 1-200 characters");
  const category = merchantCategory(Category);
  if (Category !== undefined && category === undefined) return badRequest(res, "Invalid merchant Category");
  if (Lat !== undefined && (typeof Lat !== "number" || Lat < -90 || Lat > 90)) return badRequest(res, "Lat must be between -90 and 90");
  if (Lng !== undefined && (typeof Lng !== "number" || Lng < -180 || Lng > 180)) return badRequest(res, "Lng must be between -180 and 180");
  if (Dist_ID !== undefined && (!Number.isInteger(Number(Dist_ID)) || Number(Dist_ID) <= 0)) return badRequest(res, "Dist_ID must be a positive integer");

  const updatedMerchant = await prisma.merchants.update({
    where: {
      Mch_ID: merchant.Mch_ID,
    },
    data: {
      Shop_Name,
      Owner_Name: Owner_Name?.trim(),
      Category: category,
      Lat,
      Lng,
      Dist_ID,
    },
  });

  sendJson(res, updatedMerchant);
});

merchantRoutes.post("/me/sales", requireMerchant, async (req: AuthRequest, res) => {
  const { User_ID, Total_Amount, District_ID } = req.body;

  if (!Number.isInteger(Number(User_ID)) || Number(User_ID) <= 0 || !Number.isFinite(Number(Total_Amount)) || Number(Total_Amount) <= 0 || !Number.isInteger(Number(District_ID)) || Number(District_ID) <= 0) {
    return badRequest(res, "User_ID, Total_Amount, and District_ID are required");
  }

  const userId = Number(User_ID);
  const districtId = Number(District_ID);
  const totalAmount = Number(Number(Total_Amount).toFixed(2));
  if (totalAmount <= 0) return badRequest(res, "Total_Amount must be at least 0.01");

  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user!.userId,
    },
  });

  if (!merchant) {
    return notFound(res, "Merchant not found");
  }
  if (merchant.Dist_ID !== districtId) return badRequest(res, "District_ID must match the merchant district");
  if (merchant.User_ID === userId) return badRequest(res, "Merchant cannot pay their own shop");

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

  // Fetch current subsidy ratio from global grant_policy
  const latestPolicy = await getCurrentPolicy();
  const govRatio = Number(latestPolicy.Gov_Pay_Ratio);

  const requestedGovAmount = Math.round(totalAmount * 100 * govRatio) / 100;
  const remainingGrant = activeGrant ? Number(activeGrant.Remaining_Amount) : 0;
  try {
    const transaction = await prisma.$transaction(async (tx) => {
    const dailySubsidy = await remainingDailySubsidy(tx, userId);
    const govSubsidizedAmount = Math.min(requestedGovAmount, remainingGrant, dailySubsidy.remaining);
    const userPaidAmount = Number((totalAmount - govSubsidizedAmount).toFixed(2));
    const paid = await tx.wallets.updateMany({
      where: { User_ID: userId, Status: "ACTIVE", Balance: { gte: userPaidAmount } },
      data: { Balance: { decrement: userPaidAmount } },
    });
    if (paid.count !== 1) throw new Error("INSUFFICIENT_WALLET_BALANCE");

    if (activeGrant && govSubsidizedAmount > 0) {
      const granted = await tx.user_grants.updateMany({
        where: { Grant_ID: activeGrant.Grant_ID, Status: "ACTIVE", Remaining_Amount: { gte: govSubsidizedAmount } },
        data: { Remaining_Amount: { decrement: govSubsidizedAmount } },
      });
      if (granted.count !== 1) throw new Error("GRANT_BALANCE_CHANGED");
    }

    const sale = await tx.sales_transactions.create({
      data: {
        User_ID: userId,
        Merchant_ID: merchant.Mch_ID,
        Total_Amount: totalAmount,
        User_Paid_Amount: userPaidAmount,
        Gov_Subsidized_Amount: govSubsidizedAmount,
        Tx_Timestamp: dailySubsidy.timestamp,
        District_ID: districtId,
        Status: "COMPLETED",
      },
      include: {
        users: true,
        merchants: true,
      },
    });

    await tx.wallets.upsert({
      where: { Merchant_ID: merchant.Mch_ID },
      update: { Balance: { increment: totalAmount } },
      create: { Merchant_ID: merchant.Mch_ID, Balance: totalAmount, Status: "ACTIVE" },
    });

    return sale;
    });

    sendJson(res, transaction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_WALLET_BALANCE") return badRequest(res, "Customer wallet balance is insufficient");
    if (error instanceof Error && error.message === "GRANT_BALANCE_CHANGED") return badRequest(res, "Customer grant balance changed; retry the sale");
    throw error;
  }
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
