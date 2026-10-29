import { AccountSuspendedError, checkPaymentAccounts } from '../lib/account-status';
import { Router } from "express";

import { createSession, requireAuth, requireMerchant, type AuthRequest } from "../lib/auth";
import { badRequest, notFound, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";
import { merchantCategory } from "../lib/merchant-category";
import { hashPin, validPin } from "../lib/pin";
import { getCurrentPolicy } from '../policy/policy';
import { awardMissionStamp } from '../lib/mission-stamp';
import { awardPurchaseStamps } from '../lib/purchase-stamp';
import { remainingDailySubsidy } from "../lib/daily-subsidy";
import { hashPassword, validPassword } from '../lib/password';

export const merchantRoutes = Router();

merchantRoutes.post("/register", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Shop_Name, Owner_Name, User_Name, Pin, Category, Dist_ID, Lat, Lng } = req.body;
  if (!Citizen_ID || !Phone || !Password || !Shop_Name || !Province_ID || !Dist_ID) {
    return badRequest(res, "Citizen_ID, Phone, Password, Province_ID, Shop_Name, and Dist_ID are required");
  }
  if (!/^\d{13}$/.test(String(Citizen_ID))) return badRequest(res, "Citizen_ID must contain 13 digits");
  if (!/^\d{9,15}$/.test(String(Phone).replace(/\D/g, ""))) return badRequest(res, "Phone number is invalid");
  if (!validPassword(String(Password).trim())) return badRequest(res, "Password must be 6–128 characters");
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
          Password: hashPassword(String(Password).trim()),
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

const bangkokTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatMinutesWindow(startMin?: number | null, endMin?: number | null): string | null {
  if (typeof startMin === "number" && typeof endMin === "number" && Number.isFinite(startMin) && Number.isFinite(endMin)) {
    const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
    const sm = String(startMin % 60).padStart(2, "0");
    const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
    const em = String(endMin % 60).padStart(2, "0");
    return `${sh}:${sm} - ${eh}:${em} น. (กำหนดเวลา 2 ชม.)`;
  }
  return null;
}

function formatMerchantMissionWindow(
  start: Date,
  end: Date,
  dailyStartMin?: number | null,
  dailyEndMin?: number | null,
  description?: string | null
): string {
  const fromMinutes = formatMinutesWindow(dailyStartMin, dailyEndMin);
  if (fromMinutes) return fromMinutes;

  if (description) {
    const match = description.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) {
      return `${match[1].padStart(5, "0")} - ${match[2].padStart(5, "0")} น. (กำหนดเวลา 2 ชม.)`;
    }
  }

  const startStr = bangkokTimeFormatter.format(start);
  const endStr = bangkokTimeFormatter.format(end);
  if (startStr === endStr) {
    return "14:00 - 16:00 น. (กำหนดเวลา 2 ชม.)";
  }
  return `${startStr} - ${endStr} น. (กำหนดเวลา 2 ชม.)`;
}

type RawMerchantMissionRow = {
  Mission_ID: number;
  Mission_Name: string;
  Description: string | null;
  Target_Merchant_ID: number;
  Max_Recipients: number | null;
  Start_DateTime: Date;
  End_DateTime: Date;
  Status: string;
  Campaign_Week_Start?: Date | null;
  Daily_Start_Minute?: number | null;
  Daily_End_Minute?: number | null;
  Ai_Daily_Stamp_Limit?: number | null;
};

merchantRoutes.get("/me/missions", requireMerchant, async (req: AuthRequest, res) => {
  try {
    const merchant = await prisma.merchants.findFirst({
      where: {
        User_ID: req.user!.userId,
      },
      include: {
        districts: {
          include: {
            provinces: true,
          },
        },
      },
    });

    if (!merchant) {
      return notFound(res, "Merchant not found");
    }

    let activeMissions: RawMerchantMissionRow[] = [];
    try {
      activeMissions = await prisma.$queryRaw<RawMerchantMissionRow[]>`
        SELECT
          Mission_ID,
          Mission_Name,
          Description,
          Target_Merchant_ID,
          Max_Recipients,
          Start_DateTime,
          End_DateTime,
          Status,
          Campaign_Week_Start,
          Daily_Start_Minute,
          Daily_End_Minute,
          Ai_Daily_Stamp_Limit
        FROM missions
        WHERE Target_Merchant_ID = ${merchant.Mch_ID}
          AND UPPER(TRIM(Status)) IN ('ACTIVE', 'OPEN')
        ORDER BY Start_DateTime DESC, Mission_ID DESC
      `;
    } catch {
      activeMissions = await prisma.$queryRaw<RawMerchantMissionRow[]>`
        SELECT
          Mission_ID,
          Mission_Name,
          Description,
          Target_Merchant_ID,
          Max_Recipients,
          Start_DateTime,
          End_DateTime,
          Status
        FROM missions
        WHERE Target_Merchant_ID = ${merchant.Mch_ID}
          AND UPPER(TRIM(Status)) IN ('ACTIVE', 'OPEN')
        ORDER BY Start_DateTime DESC, Mission_ID DESC
      `;
    }

    const formatted = await Promise.all(
      activeMissions.map(async (m) => {
        const stamps = await prisma.user_stamps
          .findMany({
            where: { Mission_ID: Number(m.Mission_ID) },
            select: { User_ID: true, Earned_At: true },
          })
          .catch(() => [] as { User_ID: number; Earned_At: Date }[]);

        const startDate = m.Start_DateTime instanceof Date ? m.Start_DateTime : new Date(m.Start_DateTime);
        const endDate = m.End_DateTime instanceof Date ? m.End_DateTime : new Date(m.End_DateTime);
        const startMin = m.Daily_Start_Minute != null ? Number(m.Daily_Start_Minute) : null;
        const endMin = m.Daily_End_Minute != null ? Number(m.Daily_End_Minute) : null;

        return {
          missionId: Number(m.Mission_ID),
          missionName: m.Mission_Name,
          description: m.Description || `ภารกิจซื้อสินค้าที่ร้าน ${merchant.Shop_Name}`,
          targetMerchantId: Number(m.Target_Merchant_ID),
          targetMerchantName: merchant.Shop_Name,
          targetDistId: merchant.Dist_ID,
          targetDistName: merchant.districts?.Dist_Name || "",
          targetProvId: merchant.districts?.Prov_ID || 0,
          targetProvName: merchant.districts?.provinces?.Prov_Name || "",
          minSpend: m.Campaign_Week_Start ? null : 150,
          maxRecipients: m.Max_Recipients != null ? Number(m.Max_Recipients) : null,
          currentRecipients: stamps.length,
          isAiMission: Boolean(m.Campaign_Week_Start),
          dailyStartMinute: startMin,
          dailyEndMinute: endMin,
          dailyStampLimit: m.Campaign_Week_Start ? Number(m.Ai_Daily_Stamp_Limit ?? 1) : undefined,
          rewardStampId: 1,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          timeWindowLabel: formatMerchantMissionWindow(startDate, endDate, startMin, endMin, m.Description),
          status: "active",
          category: merchant.Category || "ร้านค้าชุมชน",
          completedUserIds: stamps.map((u) => u.User_ID),
          userCompletions: stamps.map((u) => ({
            userId: u.User_ID,
            earnedAt: u.Earned_At.toISOString(),
          })),
        };
      })
    );

    sendJson(res, formatted);
  } catch (error) {
    console.error("Failed to fetch merchant missions:", error);
    sendJson(res, []);
  }
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
  const stampPaidTotal = sales.reduce((acc, s) => acc + Number(s.Stamp_Paid_Amount), 0);

  sendJson(res, {
    wallet,
    summary: {
      totalRevenue,
      totalBills: sales.length,
      userPaidTotal,
      govSubsidizedTotal,
      stampPaidTotal,
      govPaidTotal: govSubsidizedTotal + stampPaidTotal,
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

  if (req.body.Stamp_Count !== undefined && req.body.Stamp_Count !== 0) return badRequest(res, 'Customers must use stamps through /user/pay');

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
    await checkPaymentAccounts(tx, userId, merchant.User_ID, req.user!.userId);
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

    const missions = await tx.missions.findMany({
      where: {
        Target_Merchant_ID: merchant.Mch_ID,
        Status: { in: ['ACTIVE', 'active', 'OPEN', 'open'] },
        Start_DateTime: { lte: sale.Tx_Timestamp }, End_DateTime: { gte: sale.Tx_Timestamp },
      },
      orderBy: { Mission_ID: 'desc' },
      select: { Mission_ID: true },
    });
    let missionStamp = null;
    for (const mission of missions) {
      missionStamp = await awardMissionStamp(tx, mission.Mission_ID, sale);
      if (missionStamp) break;
    }
    const purchaseReward = await awardPurchaseStamps(tx, sale);
    return { ...sale, earnedStamp: missionStamp?.created ? missionStamp.stamp : null, awardedStamp: purchaseReward.stamp, awardedStampCount: purchaseReward.count };
    }, { isolationLevel: 'ReadCommitted' });

    sendJson(res, transaction, 201);
  } catch (error) {
    if (error instanceof AccountSuspendedError) return sendJson(res, { code: error.code, account: error.account, message: error.message }, 403);
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
