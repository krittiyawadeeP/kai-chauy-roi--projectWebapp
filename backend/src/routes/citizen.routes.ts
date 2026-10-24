import { Router } from "express";

import {
  createSession,
  destroySession,
  getBearerToken,
  requireAuth,
  type AuthRequest,
} from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";

export const citizenRoutes = Router();

citizenRoutes.get("/provinces", async (_req, res) => {
  const provinces = await prisma.provinces.findMany({
    orderBy: { Prov_Name: "asc" },
  });

  sendJson(res, provinces);
});

citizenRoutes.get("/districts", async (req, res) => {
  const provinceId = toNumber(req.query.prov_id);
  if (!provinceId || provinceId <= 0) {
    return badRequest(res, "prov_id must be a positive integer");
  }

  const districts = await prisma.districts.findMany({
    where: { Prov_ID: provinceId },
    orderBy: { Dist_Name: "asc" },
  });

  sendJson(res, districts);
});

citizenRoutes.post("/user", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Role } = req.body;

  if (!Citizen_ID || !Phone || !Password) {
    return badRequest(res, "Citizen_ID, Phone, and Password are required");
  }

  const user = await prisma.users.create({
    data: {
      Citizen_ID,
      Phone,
      Password,
      Province_ID,
      Role: Role ?? "USER",
      wallets: {
        create: {
          Balance: 0,
          Status: "ACTIVE",
        },
      },
      user_grants: {
        create: {
          Grant_Name: "Default government subsidy",
          Total_Grant_Amount: 1000,
          Remaining_Amount: 1000,
          Status: "ACTIVE",
        },
      },
    },
    include: {
      wallets: true,
      user_grants: true,
    },
  });

  sendJson(res, user, 201);
});

citizenRoutes.post("/login", async (req, res) => {
  const { Phone, Citizen_ID, Password } = req.body;

  if ((!Phone && !Citizen_ID) || !Password) {
    return badRequest(res, "Phone or Citizen_ID and Password are required");
  }

  const user = await prisma.users.findFirst({
    where: {
      OR: [{ Phone: Phone ?? "" }, { Citizen_ID: Citizen_ID ?? "" }],
    },
  });

  if (!user || user.Password !== Password) {
    return sendJson(res, { message: "Invalid login credentials" }, 401);
  }

  const token = createSession(user.User_ID, user.Role);

  sendJson(res, {
    token,
    user,
  });
});

citizenRoutes.post("/logout", requireAuth, (req: AuthRequest, res) => {
  const token = getBearerToken(req);

  if (token) {
    destroySession(token);
  }

  sendJson(res, { message: "Logged out" });
});

citizenRoutes.get("/user/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.users.findUnique({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      provinces: true,
      wallets: true,
      user_grants: true,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  sendJson(res, user);
});

citizenRoutes.get("/user/:userId", async (req, res) => {
  const userId = toNumber(req.params.userId);

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  const user = await prisma.users.findUnique({
    where: {
      User_ID: userId,
    },
    include: {
      provinces: true,
      wallets: true,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  sendJson(res, user);
});

citizenRoutes.patch("/user/:userId", requireAuth, async (req: AuthRequest, res) => {
  const userId = toNumber(req.params.userId);

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  if (req.user!.userId !== userId && req.user!.role !== "ADMIN") {
    return sendJson(res, { message: "You can update only your own user profile" }, 403);
  }

  const { Phone, Province_ID } = req.body;

  const user = await prisma.users.update({
    where: {
      User_ID: userId,
    },
    data: {
      Phone,
      Province_ID,
    },
  });

  sendJson(res, user);
});

citizenRoutes.patch("/user/:userId/password", requireAuth, async (req: AuthRequest, res) => {
  const userId = toNumber(req.params.userId);
  const { oldPassword, newPassword } = req.body;

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  if (!oldPassword || !newPassword) {
    return badRequest(res, "oldPassword and newPassword are required");
  }

  if (req.user!.userId !== userId && req.user!.role !== "ADMIN") {
    return sendJson(res, { message: "You can change only your own password" }, 403);
  }

  const user = await prisma.users.findUnique({
    where: {
      User_ID: userId,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  if (user.Password !== oldPassword) {
    return sendJson(res, { message: "Old password is incorrect" }, 401);
  }

  const updatedUser = await prisma.users.update({
    where: {
      User_ID: userId,
    },
    data: {
      Password: newPassword,
    },
  });

  sendJson(res, updatedUser);
});

// GET /district-stamps
citizenRoutes.get("/district-stamps", async (_req, res) => {
  const stamps = await prisma.district_stamps.findMany({
    include: {
      districts: {
        include: {
          provinces: true,
        },
      },
    },
  });

  const formatted = stamps.map((s) => ({
    stampId: s.Stamp_ID,
    stampName: s.Stamp_Name,
    distId: s.District_ID,
    provId: s.districts?.Prov_ID || 1,
    distName: s.districts?.Dist_Name || "อำเภอชุมชน",
    provName: s.districts?.provinces?.Prov_Name || "จังหวัด",
    iconName: "stamp",
    imageUrl: s.Stamp_ID === 1
      ? "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80",
    rarity: "common",
    description: `แสตมป์ของดีประจำ${s.districts?.Dist_Name || "ชุมชน"}`,
    symbolMeaning: s.Stamp_Name,
  }));

  sendJson(res, formatted);
});

// GET /missions
citizenRoutes.get("/missions", async (_req, res) => {
  const missions = await prisma.missions.findMany({
    where: {
      Status: {
        in: ["ACTIVE", "active", "OPEN", "open"],
      },
    },
    include: {
      merchants: true,
    },
    orderBy: {
      Start_DateTime: "desc",
    },
  });

  const formatted = missions.map((m) => ({
    missionId: m.Mission_ID,
    missionName: m.Mission_Name,
    description: m.Description || `ภารกิจซื้อสินค้าที่ร้าน ${m.merchants?.Shop_Name || "ร้านค้าชุมชน"}`,
    targetMerchantId: m.Target_Merchant_ID,
    targetMerchantName: m.merchants?.Shop_Name || "ร้านค้าชุมชน",
    targetDistId: m.merchants?.Dist_ID || 1,
    minSpend: 150,
    maxRecipients: m.Max_Recipients || 100,
    currentRecipients: 5,
    rewardStampId: 1,
    startDateTime: m.Start_DateTime.toISOString(),
    endDateTime: m.End_DateTime.toISOString(),
    status: "active",
    category: m.merchants?.Category || "ร้านค้าชุมชน",
    completedUserIds: [],
  }));

  sendJson(res, formatted);
});

citizenRoutes.get("/missions/:missionId", async (req, res) => {
  const missionId = toNumber(req.params.missionId);

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  const mission = await prisma.missions.findUnique({
    where: {
      Mission_ID: missionId,
    },
    include: {
      merchants: true,
      user_stamps: true,
    },
  });

  if (!mission) {
    return notFound(res, "Mission not found");
  }

  sendJson(res, mission);
});

citizenRoutes.post("/missions/:missionId/complete", requireAuth, async (req: AuthRequest, res) => {
  const missionId = toNumber(req.params.missionId);
  const { Stamp_ID, Qualifying_Amount } = req.body;

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  if (!Stamp_ID) {
    return badRequest(res, "Stamp_ID is required");
  }

  const userStamp = await prisma.user_stamps.create({
    data: {
      User_ID: req.user!.userId,
      Stamp_ID,
      Mission_ID: missionId,
      Earn_Source: "MISSION",
      Qualifying_Amount,
      Earned_At: new Date(),
    },
    include: {
      district_stamps: true,
      missions: true,
    },
  });

  sendJson(res, userStamp, 201);
});

// GET /users/me/stamps
citizenRoutes.get("/users/me/stamps", requireAuth, async (req: AuthRequest, res) => {
  const stamps = await prisma.user_stamps.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      district_stamps: {
        include: {
          districts: true,
        },
      },
      missions: true,
    },
    orderBy: {
      Earned_At: "desc",
    },
  });

  // Group by Stamp_ID
  const stampMap = new Map<number, { count: number; first: typeof stamps[0] }>();
  for (const s of stamps) {
    const existing = stampMap.get(s.Stamp_ID);
    if (existing) {
      existing.count += 1;
    } else {
      stampMap.set(s.Stamp_ID, { count: 1, first: s });
    }
  }

  const formatted = Array.from(stampMap.values()).map(({ count, first }) => ({
    userStampId: Number(first.User_Stamp_ID),
    userId: first.User_ID,
    stampId: first.Stamp_ID,
    count,
    earnedAt: first.Earned_At.toISOString().replace("T", " ").substring(0, 19),
    earnSource: "spend_150",
    qualifyingAmount: Number(first.Qualifying_Amount || 150),
  }));

  sendJson(res, formatted);
});

citizenRoutes.get("/users/me/stamps/history", requireAuth, async (req: AuthRequest, res) => {
  const history = await prisma.user_stamps.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      district_stamps: true,
      missions: true,
      stamp_earn_transactions: {
        include: {
          sales_transactions: true,
        },
      },
    },
    orderBy: {
      Earned_At: "desc",
    },
  });

  sendJson(res, history);
});

// GET /rewards
citizenRoutes.get("/rewards", async (_req, res) => {
  const rewards = await prisma.rewards.findMany({
    where: {
      Status: {
        in: ["ACTIVE", "active", "AVAILABLE", "available"],
      },
    },
  });

  const formatted = rewards.map((r) => ({
    rewardId: r.Reward_ID,
    rewardName: r.Reward_Name,
    rewardType: "discount_voucher",
    description: r.Description || `แลกรับสิทธิ์ ${r.Reward_Name} ใช้ ${r.Required_Stamp_Count} แสตมป์`,
    requiredStampCount: r.Required_Stamp_Count,
    status: "available",
    originalValue: 100,
    discountValue: 50,
    imageUrl: r.Reward_ID === 1
      ? "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80",
    provinceName: "ทั่วประเทศ",
    remainingStock: 50,
  }));

  sendJson(res, formatted);
});

citizenRoutes.post("/stamp-redemptions", requireAuth, async (req: AuthRequest, res) => {
  const { Reward_ID, Stamp_ID, Quantity } = req.body;

  if (!Reward_ID || !Stamp_ID || !Quantity) {
    return badRequest(res, "Reward_ID, Stamp_ID, and Quantity are required");
  }

  const redemption = await prisma.stamp_redemptions.create({
    data: {
      User_ID: req.user!.userId,
      Reward_ID,
      Stamp_ID,
      Quantity,
      Status: "REQUESTED",
      Redeemed_At: new Date(),
    },
    include: {
      rewards: true,
      district_stamps: true,
    },
  });

  sendJson(res, redemption, 201);
});

citizenRoutes.get("/users/me/stamp-redemptions", requireAuth, async (req: AuthRequest, res) => {
  const redemptions = await prisma.stamp_redemptions.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      rewards: true,
      district_stamps: true,
    },
    orderBy: {
      Redeemed_At: "desc",
    },
  });

  const formatted = redemptions.map((r) => ({
    redemptionId: Number(r.Redemption_ID),
    userId: r.User_ID,
    userName: "ประชาชนผู้รับสิทธิ์",
    rewardId: r.Reward_ID,
    rewardName: r.rewards?.Reward_Name || "คูปองส่วนลด",
    stampId: r.Stamp_ID,
    quantity: r.Quantity,
    status: r.Status.toLowerCase() === "completed" ? "completed" : "ready_to_use",
    redeemedAt: r.Redeemed_At.toISOString().replace("T", " ").substring(0, 19),
    redemptionCode: `THAI-REWARD-${r.Redemption_ID}`,
  }));

  sendJson(res, formatted);
});

// GET /user/me/transactions
citizenRoutes.get("/user/me/transactions", requireAuth, async (req: AuthRequest, res) => {
  const transactions = await prisma.sales_transactions.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      merchants: true,
      districts: true,
    },
    orderBy: {
      Tx_Timestamp: "desc",
    },
  });

  const formatted = transactions.map((t) => ({
    txId: Number(t.Tx_ID),
    userId: t.User_ID,
    merchantId: t.Merchant_ID,
    merchantName: t.merchants?.Shop_Name || "ร้านค้าประชารัฐ",
    totalAmount: Number(t.Total_Amount),
    userPaidAmount: Number(t.User_Paid_Amount),
    govSubsidizedAmount: Number(t.Gov_Subsidized_Amount),
    txTimestamp: t.Tx_Timestamp.toISOString().replace("T", " ").substring(0, 19),
    distId: t.District_ID,
    status: t.Status.toLowerCase() === "cancelled" ? "cancelled" : "completed",
  }));

  sendJson(res, formatted);
});

// POST /user/topup
citizenRoutes.post("/user/topup", requireAuth, async (req: AuthRequest, res) => {
  const amount = Number(req.body.amount || req.body.Amount || 500);
  if (!amount || amount <= 0) {
    return badRequest(res, "Amount must be greater than 0");
  }

  let wallet = await prisma.wallets.findFirst({
    where: { User_ID: req.user!.userId },
  });

  if (!wallet) {
    wallet = await prisma.wallets.create({
      data: {
        User_ID: req.user!.userId,
        Balance: amount,
        Status: "ACTIVE",
      },
    });
  } else {
    wallet = await prisma.wallets.update({
      where: { Wallet_ID: wallet.Wallet_ID },
      data: {
        Balance: {
          increment: amount,
        },
      },
    });
  }

  sendJson(res, {
    message: "Topup successful",
    wallet: {
      walletId: wallet.Wallet_ID,
      userId: wallet.User_ID,
      balance: Number(wallet.Balance),
      updatedAt: wallet.Updated_At,
    },
  });
});

// POST /user/pay
citizenRoutes.post("/user/pay", requireAuth, async (req: AuthRequest, res) => {
  const { Merchant_ID, Total_Amount, District_ID } = req.body;
  const totalAmount = Number(Total_Amount);
  const merchantId = Number(Merchant_ID);
  const districtId = Number(District_ID || 1);

  if (!merchantId || !totalAmount || totalAmount <= 0) {
    return badRequest(res, "Merchant_ID and valid Total_Amount are required");
  }

  const userShare = Math.round(totalAmount * 0.40 * 100) / 100;
  const govShare = Math.round(totalAmount * 0.60 * 100) / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallets.findFirst({
        where: { User_ID: req.user!.userId },
      });

      if (!wallet || Number(wallet.Balance) < userShare) {
        throw new Error(`ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ${userShare} บาท มีอยู่ ${Number(wallet?.Balance || 0)} บาท)`);
      }

      let grant = await tx.user_grants.findFirst({
        where: { User_ID: req.user!.userId, Status: "ACTIVE" },
      });

      if (!grant) {
        grant = await tx.user_grants.create({
          data: {
            User_ID: req.user!.userId,
            Grant_Name: "สิทธิร่วมจ่าย 60/40 ไทยช่วยไทย",
            Total_Grant_Amount: 1000,
            Remaining_Amount: 1000,
            Status: "ACTIVE",
          },
        });
      }

      if (Number(grant.Remaining_Amount) < govShare) {
        throw new Error(`วงเงินสิทธิรัฐช่วยจ่ายคงเหลือไม่เพียงพอ (คงเหลือ ${Number(grant.Remaining_Amount)} บาท)`);
      }

      const updatedWallet = await tx.wallets.update({
        where: { Wallet_ID: wallet.Wallet_ID },
        data: {
          Balance: {
            decrement: userShare,
          },
        },
      });

      const updatedGrant = await tx.user_grants.update({
        where: { Grant_ID: grant.Grant_ID },
        data: {
          Remaining_Amount: {
            decrement: govShare,
          },
        },
      });

      const transaction = await tx.sales_transactions.create({
        data: {
          User_ID: req.user!.userId,
          Merchant_ID: merchantId,
          Total_Amount: totalAmount,
          User_Paid_Amount: userShare,
          Gov_Subsidized_Amount: govShare,
          Tx_Timestamp: new Date(),
          District_ID: districtId,
          Status: "COMPLETED",
        },
        include: {
          merchants: true,
        },
      });

      const districtStamp = await tx.district_stamps.findFirst({
        where: { District_ID: districtId },
      });

      let awardedStamp = null;
      if (districtStamp) {
        await tx.user_stamps.create({
          data: {
            User_ID: req.user!.userId,
            Stamp_ID: districtStamp.Stamp_ID,
            Earn_Source: "CO_PAY",
            Qualifying_Amount: totalAmount,
            Earned_At: new Date(),
          },
        });
        awardedStamp = districtStamp;
      }

      return {
        transaction: {
          txId: Number(transaction.Tx_ID),
          userId: transaction.User_ID,
          merchantId: transaction.Merchant_ID,
          merchantName: transaction.merchants?.Shop_Name || "ร้านค้าชุมชน",
          totalAmount: Number(transaction.Total_Amount),
          userPaidAmount: Number(transaction.User_Paid_Amount),
          govSubsidizedAmount: Number(transaction.Gov_Subsidized_Amount),
          txTimestamp: transaction.Tx_Timestamp.toISOString().replace("T", " ").substring(0, 19),
          distId: transaction.District_ID,
          status: "completed",
        },
        wallet: {
          walletId: updatedWallet.Wallet_ID,
          userId: updatedWallet.User_ID,
          balance: Number(updatedWallet.Balance),
          updatedAt: updatedWallet.Updated_At,
        },
        grant: {
          grantId: Number(updatedGrant.Grant_ID),
          userId: updatedGrant.User_ID,
          totalGrantAmount: Number(updatedGrant.Total_Grant_Amount),
          remainingAmount: Number(updatedGrant.Remaining_Amount),
        },
        awardedStamp,
      };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    sendJson(res, result);
  } catch (err: any) {
    return badRequest(res, err.message || "การชำระเงินไม่สำเร็จ");
  }
});
